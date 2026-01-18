import axios from "axios";
import crypto from "crypto";
const CFG = {
  base: "https://api.dramabay.tv",
  img: "https://contentcdnhub.com/cms/content/images/Miniseries/release/Series",
  secret: "BZbQowEQNrdmy3NIwJe17AbvJVGB",
  pubKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3CbVdGEP+YSFugHX05kT\nIkEUtZH9fgtMytu/4FwVtQEbM3SpWQ4yQtNoToHK+jKwEDn2SKPzFlStiV+5RPln\nP3yQN3igVItwK767EHNwlN9LlPsDdW9VgEsnrStvtp9uXTC14cy0FEtEMLxFlv+U\nR7GlQUoF4Wu8fvpfsVAehSuGCp1sGytq/8IrUEgAhPq2Rk6hnX8mmqiMCLi3mjhQ\nVEwppFkV3uQQLGIM0PsER5lOqds509vGpZS2d+SOcN1NBVpFlgChqAQX3cDVzAcS\n35IjXCrXnMHT+4mYm8jc0ufwcrxkZ+iH/fUR5EwF2bvszy84k5E+XGBufqybcDI6\n/QIDAQAB\n-----END PUBLIC KEY-----",
  discovery: ["the_quarterbacks_secret_bet_on_the_nerd", "loves_perfect_crime", "the_last_kiss_before_the_heist", "my_heart_belongs_to_the_mafia_killer", "the_inheritance_game", "lies_at_the_altar_secrets_in_the_coffin", "the_marriage_contract", "marry_the_wrong_bride", "deadly_vows_the_mafias_bride", "the_hotel_of_broken_hearts", "the_haunted_sisters", "the_billionaires_vow", "the_missing_piece", "married_to_a_stranger", "lost_and_found", "why_i_did_it", "the_perfect_husband", "conflicted_hearts", "blood_contract", "fragrance_of_revenge", "a_soccer_stars_christmas_surprise", "roses_thorn_and_throne", "from_assistant_to_billionaires_wife", "billionaire_completes_my_bucket_list", "the_crown_i_never_wanted", "your_ladyships_escorting_ceo", "seducing_the_senators_wife", "in_her_shadow", "jade_foster_is_mine", "temptation_of_the_ex_wife", "double_contract_love", "return_of_the_true_heir", "romance_is_comedy", "what_summer_loves", "vampires_remedy", "love_mission", "hopeless_miss_mafia", "drowning_in_love", "playing_it_real", "school_hall", "the_infidelity_queen", "destined_to_be", "if_only_you_were_mine", "the_billionaires_lost_love", "the_day_we_got_married", "raising_a_hikikomori_heiress", "reborn_the_legend_luna_awakening", "return_of_the_secret_heiress", "marry_me_again", "invisible_love", "uncle_i_love_you", "desire_under_cover", "forbidden_desire_my_mated_stripper", "her_mountain_mate"]
};
class DramaBayApi {
  constructor() {
    this.base = CFG.base;
    this.token = null;
    this.deviceId = crypto.randomBytes(8).toString("hex");
    this.axios = axios.create({
      timeout: 3e4,
      validateStatus: status => status < 500
    });
  }
  id() {
    return crypto.randomBytes(12).toString("base64").replace(/\W/g, "").substring(0, 16);
  }
  _hmac(k, d) {
    return crypto.createHmac("sha256", k).update(d).digest();
  }
  _sha256(d) {
    return crypto.createHash("sha256").update(d).digest();
  }
  _sign(method, path, authVal, body, ts) {
    try {
      const sec = Buffer.from(CFG.secret, "utf-8");
      let k = this._hmac(sec, ts);
      k = this._hmac(k, method);
      k = this._hmac(k, path);
      if (authVal) k = this._hmac(k, authVal);
      let final = k;
      if (body && body.length > 0) {
        final = this._hmac(k, this._sha256(Buffer.from(body, "utf-8")));
      }
      return "adr2508:" + final.toString("base64");
    } catch (e) {
      return "";
    }
  }
  _fmtTitle(id) {
    return id ? id.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Unknown";
  }
  h(m = "GET", u = "", d = null, auth = false) {
    const path = u.replace(this.base, "");
    const ts = Date.now().toString();
    let authVal = null;
    if (auth && this.token) authVal = `Bearer ${this.token}`;
    const bodyStr = d ? JSON.stringify(d) : "";
    const sig = this._sign(m, path, authVal, bodyStr, ts);
    const h = {
      "User-Agent": "DramaBay_Android/1.3.1",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-usr-ts": ts,
      "x-signature": sig,
      "x-request-id": this.id()
    };
    if (authVal) h["authorization"] = authVal;
    return {
      method: m,
      url: u,
      headers: h,
      ...d && {
        data: d
      }
    };
  }
  async req(cfg) {
    try {
      console.log(`[${cfg.method}] ${cfg.url}`);
      const {
        data
      } = await this.axios.request(cfg);
      console.log(`✓ Success`);
      let result = null;
      if (data && typeof data === "object") {
        result = data;
      }
      return result;
    } catch (e) {
      console.log(`✗ Error: ${e?.response?.status || ""} ${e?.message || e}`);
      return null;
    }
  }
  async auth() {
    try {
      const d = {
        pubKey: CFG.pubKey,
        device: this.deviceId,
        provider: "anonymous"
      };
      const u = `${this.base}/account/login`;
      const res = await this.req(this.h("POST", u, d, false));
      if (res && res.token) {
        this.token = res.token;
        console.log(`Token: ${this.token?.slice(0, 50)}...`);
      }
      return res;
    } catch (e) {
      console.log(`auth error: ${e?.message || e}`);
      return null;
    }
  }
  async ensureToken({
    token,
    ...rest
  }) {
    try {
      if (token) {
        this.token = token;
        return;
      }
      if (!this.token) {
        console.log("Auto auth...");
        await this.auth();
      }
    } catch (e) {
      console.log(`ensureToken error: ${e?.message || e}`);
    }
  }
  wrapResponse(result) {
    if (!result) return null;
    return {
      ...result,
      token: this.token
    };
  }
  async home({
    token,
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const u = `${this.base}/content/all`;
      const d = {
        srlIds: CFG.discovery
      };
      const result = await this.req(this.h("POST", u, d, true));
      let rows = result?.rows || [];
      const formatted = rows.map(i => ({
        srlId: i.srlId,
        title: i.title || this._fmtTitle(i.srlId),
        totalEpisodes: (i.episodes || []).length
      }));
      return this.wrapResponse({
        data: formatted
      });
    } catch (e) {
      console.log(`home error: ${e?.message || e}`);
      return null;
    }
  }
  async search({
    token,
    query = "",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const u = `${this.base}/content/all`;
      const d = {
        srlIds: CFG.discovery
      };
      const result = await this.req(this.h("POST", u, d, true));
      let rows = result?.rows || [];
      if (query) {
        const q = query.toLowerCase();
        rows = rows.filter(i => i.srlId.includes(q));
      }
      const formatted = rows.map(i => ({
        srlId: i.srlId,
        title: i.title || this._fmtTitle(i.srlId),
        totalEpisodes: (i.episodes || []).length
      }));
      return this.wrapResponse({
        data: formatted
      });
    } catch (e) {
      console.log(`search error: ${e?.message || e}`);
      return null;
    }
  }
  async detail({
    token,
    srlId = "",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const u = `${this.base}/content/all`;
      const d = {
        srlIds: [srlId]
      };
      const result = await this.req(this.h("POST", u, d, true));
      if (!result?.rows || result.rows.length === 0) return null;
      const item = result.rows[0];
      const episodes = (item.episodes || []).map(ep => ({
        epId: ep.epId,
        no: ep.no,
        free: ep.free || false,
        img: ep.preview ? `${CFG.img}/${srlId}/${ep.preview}` : null
      }));
      const data = {
        srlId: item.srlId,
        title: item.title || this._fmtTitle(item.srlId),
        episodes: episodes
      };
      return this.wrapResponse({
        data: data
      });
    } catch (e) {
      console.log(`detail error: ${e?.message || e}`);
      return null;
    }
  }
  async stream({
    token,
    epId = "",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const ttl = 300;
      const u = `${this.base}/content/episodes/${epId}/stream?ttl=${ttl}`;
      const result = await this.req(this.h("GET", u, null, true));
      return this.wrapResponse({
        epId: epId,
        url: result?.url || result?.streamUrl,
        ttl: ttl
      });
    } catch (e) {
      console.log(`stream error: ${e?.message || e}`);
      return null;
    }
  }
  async mark({
    token,
    epId = "",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const u = `${this.base}/history/watched`;
      const d = {
        epId: epId
      };
      await this.req(this.h("POST", u, d, true));
      return this.wrapResponse({
        success: true,
        epId: epId
      });
    } catch (e) {
      console.log(`mark error: ${e?.message || e}`);
      return null;
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
      error: "Parameter 'action' wajib diisi.",
      actions: ["auth", "home", "search", "detail", "stream", "mark"]
    });
  }
  const api = new DramaBayApi();
  try {
    let response;
    switch (action) {
      case "auth":
        response = await api.auth();
        break;
      case "home":
        response = await api.home(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.srlId) {
          return res.status(400).json({
            error: "Parameter 'srlId' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "stream":
        if (!params.epId) {
          return res.status(400).json({
            error: "Parameter 'epId' wajib diisi untuk action 'stream'."
          });
        }
        response = await api.stream(params);
        break;
      case "mark":
        if (!params.epId) {
          return res.status(400).json({
            error: "Parameter 'epId' wajib diisi untuk action 'mark'."
          });
        }
        response = await api.mark(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["auth", "home", "search", "detail", "stream", "mark"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}