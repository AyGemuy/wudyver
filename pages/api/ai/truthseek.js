import axios from "axios";
import crypto from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SearchAPI {
  constructor() {
    this.gen();
    this.token = null;
    this.uid = null;
    this.base = "https://api.searchanyone.dev/v1";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        "Content-Type": "application/json"
      }
    }));
  }
  gen() {
    Object.assign(this, {
      aid: "truthseek",
      did: crypto.randomBytes(32).toString("hex").toUpperCase(),
      tz: "Asia/Makassar",
      dname: "RMX3890",
      loc: "id",
      sys: "android",
      ver: "999999",
      os: "35",
      country: "ID",
      appid: "1001"
    });
    this.log("📱 Device generated", {
      did: this.did
    });
  }
  log(msg, data = null) {
    const ts = new Date().toLocaleTimeString("id-ID");
    console.log(`[${ts}] ${msg}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
  spoof() {
    return {
      "User-Agent": "okhttp/4.9.3",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive"
    };
  }
  hdr(step = 1) {
    const {
      aid,
      did,
      tz,
      dname,
      loc,
      sys,
      ver,
      os,
      country,
      appid,
      uid,
      token
    } = this;
    const base = {
      ...this.spoof(),
      "Content-Type": "application/json",
      aid: aid,
      deviceid: did,
      timezone: tz,
      devicename: dname,
      locale: loc,
      clientsys: sys,
      appversion: ver,
      osversion: os,
      country: country,
      appid: appid
    };
    if (step === 1) return base;
    return {
      ...base,
      uid: uid,
      token: token
    };
  }
  async auth() {
    try {
      this.log("🔐 [STEP 1] Auth login/did...");
      const headers1 = this.hdr(1);
      const res1 = await this.client({
        method: "POST",
        url: `${this.base}/ai/search/login/did`,
        headers: headers1,
        data: {}
      });
      const token1 = res1?.data?.data?.token;
      const userId = res1?.data?.data?.userId;
      if (!token1 || !userId) throw new Error("Failed to get token/uid from Step 1");
      this.token = token1;
      this.uid = String(userId);
      this.log("✅ [STEP 1] Success", {
        uid: this.uid
      });
      this.log("🔐 [STEP 2] Verifying session...");
      const headers2 = this.hdr(2);
      const res2 = await this.client({
        method: "POST",
        url: `${this.base}/ai/search/login/did`,
        headers: headers2,
        data: {}
      });
      const token2 = res2?.data?.data?.token;
      if (!token2) throw new Error("Failed to get final token from Step 2");
      this.token = token2;
      this.log("✅ [STEP 2] Auth Finalized");
      return token2;
    } catch (err) {
      const errorMsg = err?.response?.data || err.message;
      this.log("❌ Auth fail", errorMsg);
      throw err;
    }
  }
  async ensure() {
    if (!this.token) await this.auth();
    return this.token;
  }
  async chat({
    prompt: query,
    advanced: advanceSearch = 0,
    ...rest
  }) {
    try {
      await this.ensure();
      const payload = {
        query: query,
        advanceSearch: advanceSearch,
        ...rest
      };
      this.log(`🔍 Searching: "${query}"`);
      const headers3 = this.hdr(2);
      const {
        data
      } = await this.client({
        method: "POST",
        url: `${this.base}/search`,
        headers: headers3,
        data: payload
      });
      if (data.code !== 200 && data.code !== 0) {
        throw new Error(data.msg || "Unknown API Error");
      }
      this.log("✅ Search Success");
      return data;
    } catch (err) {
      const status = err?.response?.status;
      const errorData = err?.response?.data;
      this.log("❌ Search fail", errorData || err.message);
      if (status === 401 || status === 403 || errorData && errorData.code === 401) {
        this.log("🔄 Token expired, re-authenticating...");
        this.token = null;
        return this.req({
          query: query,
          advanceSearch: advanceSearch,
          ...rest
        });
      }
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new SearchAPI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}