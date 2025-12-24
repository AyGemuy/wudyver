import axios from "axios";
import CryptoJS from "crypto-js";
import {
  v4 as uuidv4
} from "uuid";
class AiChattings {
  constructor() {
    this.cfg = {
      base: "https://backend.aichattings.com/api",
      secret: "e82ckenh8dichen8",
      ep: {
        token: "/v2/user/register",
        chat: "/v3/chatgpt/talk",
        search: "/v3/role/list"
      },
      def: {
        encKey: "jo177g1a3g0io",
        model: "gpt3",
        locale: "en",
        roleId: 4739,
        subType: "0",
        epType: "web",
        os: "Win10",
        devModel: "PC",
        ver: "1.0.0"
      },
      bi: JSON.stringify({
        language: "id-ID",
        languages: ["id-ID", "en-US"],
        timeZone: "Asia/Makassar",
        timezoneOffset: -480,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        timeString: new Date().toString()
      })
    };
    this.vt = null;
    this.uid = null;
    this.uuid = uuidv4();
    this.client = axios.create({
      baseURL: this.cfg.base,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en",
        "content-type": "application/json",
        origin: "https://aichatgpt.social",
        referer: "https://aichatgpt.social/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "browser-info": encodeURIComponent(this.cfg.bi)
      }
    });
  }
  enc(path, data = {}) {
    try {
      const json = JSON.stringify(data);
      const str = `nobody${path}use${json}md5forencrypt`;
      const sign = CryptoJS.MD5(str).toString();
      const raw = `${path}-36cd479b6b5-${json}-36cd479b6b5-${sign}`;
      const key = CryptoJS.enc.Utf8.parse(this.cfg.secret);
      const enc = CryptoJS.AES.encrypt(raw, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });
      return enc.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    } catch (e) {
      console.error("[Enc Err]", e?.message);
      return null;
    }
  }
  async req(url, data = {}, extraBody = {}) {
    try {
      const headers = {
        vtoken: this.vt || ""
      };
      const payload = {
        params: this.enc(url, data),
        ...extraBody
      };
      const res = await this.client.post(url, payload, {
        headers: headers
      });
      if (res.data?.code === -10) {
        console.log("[LOG] Token Expired. Re-registering...");
        await this.reg();
        return this.req(url, data, extraBody);
      }
      return res.data;
    } catch (e) {
      console.error(`[Req Err]`, e?.message);
      return {
        code: -1,
        msg: e?.message
      };
    }
  }
  async reg() {
    try {
      const res = await this.req(this.cfg.ep.token, {
        uuid: this.uuid,
        endpoint_type: this.cfg.def.epType,
        subscribe_type: this.cfg.def.subType,
        device_model: this.cfg.def.devModel,
        os_version: this.cfg.def.os,
        app_version: this.cfg.def.ver
      });
      if (res?.code === 1) {
        this.vt = res.data?.vToken;
        this.uid = res.data?.id;
      }
      return this.vt;
    } catch (e) {
      console.error("[Reg Err]", e);
    }
  }
  async search({
    query,
    ...rest
  }) {
    try {
      if (!this.vt) await this.reg();
      const payload = {
        name: query,
        pageSize: 100,
        page: 1,
        locale: this.cfg.def.locale,
        ...rest
      };
      const res = await this.req(this.cfg.ep.search, payload);
      if (res?.code === 1) {
        const results = res.data?.data?.map(item => ({
          id: item.attributes.rawId,
          name: item.attributes.name,
          desc: item.attributes.desc,
          avatar: item.attributes.avatar?.data?.attributes?.url
        })) || [];
        return {
          status: "success",
          data: results
        };
      }
      return {
        status: "error",
        msg: res?.msg
      };
    } catch (e) {
      return {
        status: "error",
        msg: e.message
      };
    }
  }
  async chat({
    prompt,
    ...rest
  }) {
    try {
      if (!prompt) return {
        status: "error",
        msg: "Prompt required"
      };
      if (!this.vt) await this.reg();
      const rid = rest.roleId || this.cfg.def.roleId;
      const mRaw = rest.model || this.cfg.def.model;
      const mFixed = mRaw === "gpt3" ? "chat_gpt3.5" : mRaw === "gpt4" ? "chat_gpt4" : mRaw;
      const payload = {
        msg: prompt,
        model: mFixed,
        role_id: rid,
        locale: this.cfg.def.locale,
        ep_user_id_temp: this.uid,
        ep_user_id: this.uid,
        ...rest
      };
      const res = await this.req(this.cfg.ep.chat, payload, {
        encKey: this.cfg.def.encKey
      });
      let data = res;
      if (typeof res === "string") {
        try {
          data = JSON.parse(res);
        } catch {}
      }
      if (typeof data === "string") {
        return {
          status: "success",
          data: {
            content: data
          }
        };
      } else if (data?.code === -1 || data?.code === -2) {
        return {
          status: "error",
          msg: data?.msg || "Error/Limit Reached"
        };
      } else {
        return {
          status: "success",
          data: data?.data || data
        };
      }
    } catch (e) {
      return {
        status: "error",
        msg: e?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AiChattings();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'chat'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}