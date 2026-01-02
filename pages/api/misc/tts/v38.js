import axios from "axios";
import crypto from "crypto";
class GetVoices {
  constructor() {
    const devId = crypto.randomBytes(8).toString("hex");
    this.cfg = {
      baseUrl: "https://api2.getvoices.ai/api/v1",
      authUrl: "https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyBLUOuCL4MSweSny6qraVd-JLWXlK6qy4w",
      headers: {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "Accept-Language": "id-ID,id;q=0.5"
      },
      common: {
        appVersion: "1.14.27",
        platform: "android",
        groupId: 200,
        deviceId: devId,
        lang: "id",
        uuid: `android_${devId}`
      }
    };
    this.token = null;
    this.uid = null;
    this.userInfo = null;
    this.initialized = false;
  }
  log(msg, level = "INFO") {
    const time = new Date().toISOString().split("T")[1].split(".")[0];
    console.log(`[${time}] [${level}] ${msg}`);
  }
  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      this.log("Starting Auto-Initialization...", "INIT");
      await this.login();
      const resUser = await this.user();
      this.userInfo = resUser?.user || resUser;
      this.log(`User ID: ${this.uid?.substring(0, 6)}... | Credits: ${this.userInfo?.credits}`, "INFO");
      const canClaim = this.userInfo?.canCollectDailyReward || this.userInfo?.dailyRewardData?.isReadyToCollect;
      if (canClaim) {
        await this.claim();
      } else {
        this.log("Daily reward not ready yet.", "SKIP");
      }
      this.log("System Ready.", "INIT");
    } catch (e) {
      this.initialized = false;
      this.log(`Init Failed: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async login() {
    if (this.token) return;
    try {
      const authHeaders = {
        ...this.cfg.headers,
        "X-Android-Package": "com.leonfiedler.voiceai",
        "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA"
      };
      const {
        data
      } = await axios.post(this.cfg.authUrl, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: authHeaders
      });
      this.token = data?.idToken;
      this.uid = data?.localId;
    } catch (e) {
      throw new Error(`Login failed: ${e.message}`);
    }
  }
  async request(path, payload = {}) {
    const isSetupPath = path === "/user" || path.includes("/reward/claim");
    if (!this.initialized && !isSetupPath && !this.token) {
      await this.init();
    } else if (!this.token) {
      await this.login();
    }
    try {
      const endpoint = `${this.cfg.baseUrl}${path}`;
      const {
        token: _,
        ...cleanPayload
      } = payload;
      const body = {
        ...this.cfg.common,
        ...cleanPayload,
        uid: cleanPayload.uid || this.uid
      };
      const {
        data
      } = await axios.post(endpoint, body, {
        headers: {
          ...this.cfg.headers,
          Authorization: this.token,
          "x-request-id": crypto.randomUUID()
        }
      });
      return data;
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message;
      this.log(`Error ${path}: ${msg}`, "ERROR");
      return {
        status: "error",
        message: msg
      };
    }
  }
  async user(payload = {}) {
    return await this.request("/user", payload);
  }
  async claim(payload = {}) {
    this.log("Claiming daily reward...", "CLAIM");
    const res = await this.request("/user/reward/claim", payload);
    const newCredits = res?.credits ?? res?.user?.credits;
    if (newCredits !== undefined) {
      this.log(`Claimed! New Balance: ${newCredits}`, "CLAIM");
      if (this.userInfo) this.userInfo.credits = newCredits;
    }
    return res;
  }
  async generate({
    text,
    voice,
    ...rest
  } = {}) {
    const payload = {
      text: text || "Halo",
      voice: voice || "joe_biden",
      subscribed: false,
      startTime: Date.now(),
      translate: "id",
      stream: false,
      ...rest
    };
    return await this.request("/tts/create", payload);
  }
  async lyrics({
    prompt,
    ...rest
  } = {}) {
    this.log(`Generating lyrics for: ${prompt}`, "LYRICS");
    return await this.request("/music/lyrics/create", {
      lyrics: prompt || "Song lyrics",
      ...rest
    });
  }
  async voice_list(payload = {}) {
    this.log("Fetching trending content...", "TREND");
    return await this.request("/music/trending", payload);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "lyrics", "voice_list"]
    });
  }
  const api = new GetVoices();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'generate'"
          });
        }
        result = await api.generate(params);
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'lyrics'"
          });
        }
        result = await api.lyrics(params);
        break;
      case "voice_list":
        result = await api.voice_list(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "lyrics", "voice_list"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}