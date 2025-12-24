import axios from "axios";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
class LitMediaAPI {
  constructor() {
    this.accountApi = axios.create({
      baseURL: "https://account-api.litmedia.ai"
    });
    this.musicApi = axios.create({
      baseURL: "https://aimusic-api.litmedia.ai"
    });
    this.token = null;
    this.memberId = null;
    this.memberCode = null;
  }
  _randStr(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  _randEmail() {
    const username = this._randStr(8) + "." + this._randStr(4);
    return `${username}@litmedia.com`;
  }
  _randPass() {
    const raw = this._randStr(12);
    const hashed = CryptoJS.MD5(raw).toString(CryptoJS.enc.Hex);
    return {
      raw: raw,
      hashed: hashed
    };
  }
  _timestamp() {
    return Date.now();
  }
  _genSoftwareCode() {
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  _genSign(email, timestamp, softwareCode) {
    const data = `${email}${timestamp}${softwareCode}litmedia`;
    const hash = CryptoJS.SHA1(data).toString(CryptoJS.enc.Hex);
    return hash.toUpperCase();
  }
  _decData(jsonData) {
    const Fi = CryptoJS.enc.Utf8.parse("147258369topmeidia96385topmeidia");
    const Di = CryptoJS.enc.Utf8.parse("1597531topmeidia");
    const decryptString = encryptedText => {
      try {
        const decrypted = CryptoJS.AES.decrypt(encryptedText, Fi, {
          iv: Di,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
      } catch (error) {
        return "Decryption failed.";
      }
    };
    if (!jsonData || !jsonData.data || !Array.isArray(jsonData.data.result)) {
      return jsonData;
    }
    jsonData.data.result.forEach(item => {
      if (item.audio_url) {
        item.audio_url = decryptString(item.audio_url);
      }
      if (item.cover_url) {
        item.cover_url = decryptString(item.cover_url);
      }
    });
    return jsonData;
  }
  async auth({
    ...rest
  } = {}) {
    try {
      const email = this._randEmail();
      const passData = this._randPass();
      const timestamp = this._timestamp();
      const softwareCode = this._genSoftwareCode();
      const sign = this._genSign(email, timestamp, softwareCode);
      const gacidTimestamp = Math.floor(timestamp / 1e3);
      const gacidClientId = Math.floor(Math.random() * 1e9);
      const gacid = `${gacidClientId}.${gacidTimestamp}`;
      const formData = new URLSearchParams();
      formData.append("email", email);
      formData.append("password", passData.hashed);
      formData.append("software_code", softwareCode);
      formData.append("from_pid", "");
      formData.append("from_language", "id-ID");
      formData.append("from_url", "www.litmedia.ai");
      formData.append("source_site", "www.litmedia.ai");
      formData.append("from_site_name", "https://www.litmedia.ai");
      formData.append("gacid", gacid);
      formData.append("operating_system", "android");
      formData.append("site_initializing", "www.litmedia.ai");
      formData.append("site_initializing_time", gacidTimestamp);
      formData.append("lang", "EN");
      formData.append("terminal", "4");
      formData.append("information_sources", "https://account.litmedia.ai");
      formData.append("sign", sign);
      formData.append("timestamp", timestamp);
      formData.append("origin_site", "www.litmedia.ai");
      for (const key in rest) {
        formData.append(key, rest[key]);
      }
      const response = await this.accountApi.post("/account/register", formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Origin: "https://account.litmedia.ai",
          Pragma: "no-cache",
          Priority: "u=1, i",
          Referer: "https://account.litmedia.ai/",
          "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": '"Android"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      if (response.data.code === 200) {
        this.token = response.data.data.token;
        this.memberId = response.data.data.member_id;
        this.memberCode = response.data.data.member_code;
        return {
          success: true,
          data: response.data.data,
          email: email,
          rawPassword: passData.raw,
          softwareCode: softwareCode,
          sign: sign
        };
      } else {
        return {
          success: false,
          message: response.data.msg,
          code: response.data.code
        };
      }
    } catch (error) {
      console.error("Auth error:", error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.msg || error.message
      };
    }
  }
  async lyrics({
    token,
    prompt,
    ...rest
  } = {}) {
    let currentToken = token || this.token;
    if (!currentToken) {
      console.log("Auto-authenticating...");
      const authResult = await this.auth();
      if (!authResult.success) {
        throw new Error(`Auto-auth failed: ${authResult.message}`);
      }
      console.log("✓ Auto-auth successful");
      currentToken = this.token;
    }
    try {
      const headers = {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Origin: "https://www.litmedia.ai",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://www.litmedia.ai/",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
      if (currentToken) {
        headers.Authorization = `Bearer ${currentToken}`;
      }
      const response = await this.musicApi.get("/litmedia/v1/lyrics", {
        params: {
          prompt: prompt,
          ...rest
        },
        headers: headers
      });
      return {
        ...response.data,
        token: currentToken,
        memberId: this.memberId,
        memberCode: this.memberCode
      };
    } catch (error) {
      console.error("Lyrics error:", error.response?.data || error.message);
      throw error;
    }
  }
  async create({
    token,
    lyrics = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    title = "Grocery Store Anthem",
    style = "Sheng,Symphonic Metal,Content",
    instrumental = 0,
    ...rest
  }) {
    let currentToken = token || this.token;
    if (!currentToken) {
      console.log("Auto-authenticating...");
      const authResult = await this.auth();
      if (!authResult.success) {
        throw new Error(`Auto-auth failed: ${authResult.message}`);
      }
      console.log("✓ Auto-auth successful");
      currentToken = this.token;
    }
    try {
      const payload = {
        lyrics: lyrics,
        title: title,
        style: style,
        instrumental: instrumental,
        ...rest
      };
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Origin: "https://www.litmedia.ai",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://www.litmedia.ai/",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
      if (currentToken) {
        headers.Authorization = `Bearer ${currentToken}`;
      }
      const response = await this.musicApi.post("/litmedia/v1/lyric-to-song", payload, {
        headers: headers
      });
      return {
        ...response.data,
        token: currentToken,
        memberId: this.memberId,
        memberCode: this.memberCode
      };
    } catch (error) {
      console.error("Create error:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    token,
    ids,
    ...rest
  }) {
    let currentToken = token || this.token;
    if (!currentToken) {
      console.log("Auto-authenticating...");
      const authResult = await this.auth();
      if (!authResult.success) {
        throw new Error(`Auto-auth failed: ${authResult.message}`);
      }
      console.log("✓ Auto-auth successful");
      currentToken = this.token;
    }
    const idsString = Array.isArray(ids) ? ids.join(",") : ids;
    try {
      const headers = {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Origin: "https://www.litmedia.ai",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://www.litmedia.ai/",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
      if (currentToken) {
        headers.Authorization = `Bearer ${currentToken}`;
      }
      const response = await this.musicApi.get("/litmedia/v1/song/result", {
        params: {
          ids: idsString,
          ...rest
        },
        headers: headers
      });
      return {
        ...this._decData(response.data),
        token: currentToken,
        memberId: this.memberId,
        memberCode: this.memberCode
      };
    } catch (error) {
      console.error("Status error:", error.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const litMediaAPI = new LitMediaAPI();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.lyrics) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameters: lyrics"
          });
        }
        result = await litMediaAPI.create(params);
        break;
      case "status":
        if (!params.ids) {
          return res.status(400).json({
            success: false,
            message: "No ids provided"
          });
        }
        result = await litMediaAPI.status(params);
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            success: false,
            message: "No prompt provided"
          });
        }
        result = await litMediaAPI.lyrics(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action. Use ?action=create, ?action=status, ?action=lyrics"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("LitMedia API Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error"
    });
  }
}