import axios from "axios";
import {
  randomBytes
} from "crypto";
class ToMoviee {
  constructor() {
    this.email = this.genEmail();
    this.pass = this.genPass();
    this.token = null;
    this.clientToken = null;
    this.uid = null;
    this.spaceId = null;
    this.baseUrl = "https://api.tomoviee.ai/v1/skymedia";
    this.authUrl = "https://api.wondershare.cc/v3/user";
    this.headers = {
      "User-Agent": "ToMoviee APP I18N",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip"
    };
    this.apiHeaders = {
      "x-app-key": "82022654efd363d3a26ef8329948f9ec",
      "x-client-sn": "0666b2e8da418dfa",
      "x-client-type": "4",
      "x-prod-id": "20395",
      "x-prod-name": "tomoviee_com",
      "x-lang": "en-us",
      "x-prod-ver": "99.9.9.9",
      "x-client-ver": "99.9.9.9",
      "x-model-ver": "v2.0"
    };
    console.log("[INIT] Email:", this.email, "| Pass:", this.pass);
  }
  genEmail() {
    const rand = randomBytes(8).toString("hex");
    return `user${rand}@gmail.com`;
  }
  genPass() {
    const rand = randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
    return `${rand}Aa1@`;
  }
  setToken(token) {
    this.token = token;
    console.log("[TOKEN] User token set");
  }
  setClientToken(token) {
    this.clientToken = token;
    console.log("[TOKEN] Client token set");
  }
  getHeaders(type = "auth") {
    if (type === "auth") {
      return {
        ...this.headers,
        "X-App-Key": this.apiHeaders["x-app-key"],
        "X-Client-Sn": this.apiHeaders["x-client-sn"],
        "X-Client-Type": this.apiHeaders["x-client-type"],
        "X-Prod-Id": this.apiHeaders["x-prod-id"],
        "X-Prod-Name": this.apiHeaders["x-prod-name"],
        "X-Lang": this.apiHeaders["x-lang"],
        "X-Prod-Ver": this.apiHeaders["x-prod-ver"],
        "X-Client-Ver": this.apiHeaders["x-client-ver"],
        "X-Model-Ver": this.apiHeaders["x-model-ver"]
      };
    }
    return {
      ...this.headers,
      ...this.apiHeaders
    };
  }
  parseJson(d) {
    if (typeof d === "string") {
      try {
        return this.parseJson(JSON.parse(d));
      } catch {
        return d;
      }
    }
    if (Array.isArray(d)) {
      return d.map(item => this.parseJson(item));
    }
    if (d && typeof d === "object") {
      const obj = {};
      for (const key in d) {
        obj[key] = this.parseJson(d[key]);
      }
      return obj;
    }
    return d;
  }
  async getClientToken() {
    if (this.clientToken) {
      console.log("[CLIENT] Token tersedia");
      return {
        success: true,
        token: this.clientToken
      };
    }
    console.log("[CLIENT] Getting token...");
    try {
      const {
        data
      } = await axios.post(`${this.authUrl}/client/token`, {
        app_secret: "59f167e7ee12d4ce39a606f10a6cb638",
        grant_type: "client_credentials"
      }, {
        headers: {
          ...this.getHeaders("auth"),
          "Content-Type": "application/json"
        }
      });
      const parsed = this.parseJson(data);
      this.clientToken = parsed?.data?.access_token || null;
      console.log("[CLIENT] Token obtained");
      return {
        success: true,
        token: this.clientToken,
        data: parsed
      };
    } catch (e) {
      console.error("[CLIENT] Error:", e.message);
      return {
        success: false,
        error: "Gagal get client token",
        details: e.message
      };
    }
  }
  async verifyEmail(email) {
    const tkn = this.clientToken || (await this.getClientToken()).token;
    if (!tkn) return {
      success: false,
      error: "Client token tidak tersedia"
    };
    try {
      console.log("[VERIFY] Checking email...");
      const {
        data
      } = await axios.get(`${this.authUrl}/email/verify?email=${email}`, {
        headers: {
          ...this.getHeaders("auth"),
          Authorization: `Bearer ${tkn}`
        }
      });
      const parsed = this.parseJson(data);
      return {
        success: true,
        data: parsed
      };
    } catch (e) {
      console.error("[VERIFY] Error:", e.message);
      return {
        success: false,
        error: "Gagal verify email",
        details: e.message
      };
    }
  }
  async register({
    email,
    pass,
    country = "CN"
  } = {}) {
    const em = email || this.email;
    const pw = pass || this.pass;
    const tkn = this.clientToken || (await this.getClientToken()).token;
    if (!tkn) return {
      success: false,
      error: "Client token tidak tersedia"
    };
    try {
      console.log("[REGISTER] Creating account...");
      const {
        data
      } = await axios.post(`${this.authUrl}/account`, {
        account_type: 2,
        country: country,
        email: em,
        lang: "en-us",
        password: pw,
        region_type: 1,
        register_type: 2
      }, {
        headers: {
          ...this.getHeaders("auth"),
          "Content-Type": "application/json",
          Authorization: `Bearer ${tkn}`
        }
      });
      const parsed = this.parseJson(data);
      console.log("[REGISTER] Account created");
      return {
        success: true,
        data: parsed
      };
    } catch (e) {
      console.error("[REGISTER] Error:", e.message);
      return {
        success: false,
        error: "Gagal register",
        details: e.message
      };
    }
  }
  async login({
    email,
    pass,
    autoRegister = true
  } = {}) {
    const em = email || this.email;
    const pw = pass || this.pass;
    if (!em || !pw) {
      return {
        success: false,
        error: "Email dan password wajib diisi"
      };
    }
    try {
      console.log("[LOGIN] Logging in...");
      const {
        data
      } = await axios.post(`${this.authUrl}/client/token`, {
        app_secret: "59f167e7ee12d4ce39a606f10a6cb638",
        grant_type: "password",
        password: pw,
        username: em
      }, {
        headers: {
          ...this.getHeaders("auth"),
          "Content-Type": "application/json"
        }
      });
      const parsed = this.parseJson(data);
      this.token = parsed?.data?.access_token || null;
      this.uid = parsed?.data?.uid || null;
      console.log("[LOGIN] Login sukses");
      return {
        success: true,
        token: this.token,
        uid: this.uid,
        data: parsed
      };
    } catch (e) {
      console.error("[LOGIN] Error:", e.message);
      if (autoRegister && (e.response?.status === 400 || e.response?.status === 401)) {
        console.log("[LOGIN] Auto registering...");
        const regResult = await this.register({
          email: em,
          pass: pw
        });
        if (regResult.success) {
          console.log("[LOGIN] Retry login after register...");
          return await this.login({
            email: em,
            pass: pw,
            autoRegister: false
          });
        }
      }
      return {
        success: false,
        error: "Login gagal",
        details: e.message
      };
    }
  }
  async ensureAuth(token) {
    const tkn = token || this.token;
    if (tkn) {
      console.log("[AUTH] Token tersedia");
      if (token) this.token = token;
      if (!this.spaceId) {
        console.log("[AUTH] Getting space ID...");
        const info = await this.userInfo(tkn);
        if (info.success && info.data?.data) {
          this.spaceId = info.data.data.uid || this.uid;
          console.log("[AUTH] Space ID set:", this.spaceId);
        }
      }
      return {
        success: true,
        token: tkn
      };
    }
    if (!this.email || !this.pass) {
      return {
        success: false,
        error: "Email dan password wajib untuk auto login"
      };
    }
    console.log("[AUTH] Auto login...");
    const result = await this.login({
      email: this.email,
      pass: this.pass
    });
    if (result.success) {
      await this.initUser();
      await this.dailyReward();
      const info = await this.userInfo();
      if (info.success && info.data?.data) {
        this.spaceId = info.data.data.uid || this.uid;
        console.log("[AUTH] Space ID set:", this.spaceId);
      }
      return {
        success: true,
        token: this.token
      };
    }
    return result;
  }
  async initUser(token) {
    const tkn = token || this.token;
    if (!tkn) return {
      success: false,
      error: "Token tidak tersedia"
    };
    try {
      console.log("[INIT] Initializing user...");
      const spaceId = this.spaceId || this.uid || "";
      const {
        data
      } = await axios.post(`${this.baseUrl}/init-user`, {}, {
        headers: {
          ...this.getHeaders(),
          authorization: `Bearer ${tkn}`,
          "x-space-id": spaceId
        }
      });
      const parsed = this.parseJson(data);
      return {
        success: true,
        data: parsed
      };
    } catch (e) {
      console.error("[INIT] Error:", e.message);
      return {
        success: false,
        error: "Init user gagal",
        details: e.message
      };
    }
  }
  async dailyReward(token, timezone = "Asia/Makassar") {
    const tkn = token || this.token;
    if (!tkn) return {
      success: false,
      error: "Token tidak tersedia"
    };
    try {
      console.log("[REWARD] Claiming daily...");
      const spaceId = this.spaceId || this.uid || "";
      const {
        data
      } = await axios.post(`${this.baseUrl}/op/daily-reward`, {
        time_zone: timezone
      }, {
        headers: {
          ...this.getHeaders(),
          "Content-Type": "application/json",
          authorization: `Bearer ${tkn}`,
          "x-space-id": spaceId
        }
      });
      const parsed = this.parseJson(data);
      return {
        success: true,
        data: parsed
      };
    } catch (e) {
      console.error("[REWARD] Error:", e.message);
      return {
        success: false,
        error: "Daily reward gagal",
        details: e.message
      };
    }
  }
  async userInfo(token) {
    const tkn = token || this.token;
    if (!tkn) return {
      success: false,
      error: "Token tidak tersedia"
    };
    try {
      console.log("[INFO] Getting user info...");
      const spaceId = this.spaceId || this.uid || "";
      const {
        data
      } = await axios.get(`${this.baseUrl}/user-info`, {
        headers: {
          ...this.getHeaders(),
          authorization: `Bearer ${tkn}`,
          "x-space-id": spaceId
        }
      });
      const parsed = this.parseJson(data);
      if (parsed?.data?.uid && !this.spaceId) {
        this.spaceId = parsed.data.uid;
        console.log("[INFO] Space ID updated:", this.spaceId);
      }
      return {
        success: true,
        data: parsed
      };
    } catch (e) {
      console.error("[INFO] Error:", e.message);
      return {
        success: false,
        error: "Get user info gagal",
        details: e.message
      };
    }
  }
  async solveMedia(m) {
    if (!m) return null;
    const arr = Array.isArray(m) ? m : [m];
    const res = [];
    for (const item of arr) {
      try {
        if (typeof item === "string") {
          if (item.startsWith("http")) {
            console.log("[MEDIA] URL detected");
            res.push({
              url: item,
              type: "url"
            });
          } else if (item.startsWith("data:")) {
            console.log("[MEDIA] Base64 detected");
            res.push({
              data: item.split(",")[1],
              type: "base64"
            });
          } else {
            console.log("[MEDIA] Base64 string detected");
            res.push({
              data: item,
              type: "base64"
            });
          }
        } else if (Buffer.isBuffer(item)) {
          console.log("[MEDIA] Buffer detected");
          res.push({
            data: item.toString("base64"),
            type: "buffer"
          });
        }
      } catch (e) {
        console.error("[MEDIA] Error:", e.message);
      }
    }
    return res;
  }
  async uploadMedia(mediaArr, token) {
    const ids = [];
    for (const m of mediaArr || []) {
      try {
        console.log("[UPLOAD] Uploading...");
        const now = new Date();
        const y = now.getFullYear();
        const mo = (now.getMonth() + 1).toString().padStart(2, "0");
        const key = `pcloud/0/3/${y}${mo}/${Date.now()}.jpeg`;
        const spaceId = this.spaceId || this.uid || "";
        const {
          data
        } = await axios.post(`${this.baseUrl}/ai/file-sign-url`, {
          need_media: false,
          object_key: key
        }, {
          headers: {
            ...this.getHeaders(),
            "Content-Type": "application/json",
            authorization: `Bearer ${token}`,
            "x-space-id": spaceId
          }
        });
        const parsed = this.parseJson(data);
        const signUrl = parsed?.data?.sign_url || null;
        if (signUrl && m.data) {
          await axios.put(signUrl, Buffer.from(m.data, "base64"), {
            headers: {
              "Content-Type": "image/jpeg"
            }
          });
          const fileId = key.split("/").pop().replace(".jpeg", "");
          ids.push(fileId);
          console.log("[UPLOAD] Sukses:", fileId);
        }
      } catch (e) {
        console.error("[UPLOAD] Error:", e.message);
      }
    }
    return ids;
  }
  async generate({
    token,
    mode,
    prompt,
    media,
    ...rest
  } = {}) {
    if (!mode) {
      return {
        success: false,
        error: 'Parameter "mode" wajib diisi'
      };
    }
    const validModes = ["image", "video", "music", "chat"];
    if (!validModes.includes(mode)) {
      return {
        success: false,
        error: `Mode tidak valid. Gunakan: ${validModes.join(", ")}`
      };
    }
    if (!prompt) {
      return {
        success: false,
        error: 'Parameter "prompt" wajib diisi'
      };
    }
    const authResult = await this.ensureAuth(token);
    if (!authResult.success) return authResult;
    const tkn = authResult.token;
    console.log(`[GENERATE] Mode: ${mode}`);
    const mediaArr = await this.solveMedia(media);
    const fileIds = mediaArr?.length > 0 ? await this.uploadMedia(mediaArr, tkn) : [];
    const endpoints = {
      image: "ai/text-to-image",
      video: "ai/text-to-video",
      music: "ai/text-to-music",
      chat: "ai/chat/completion"
    };
    const bodies = {
      image: {
        prompt: prompt,
        qty: rest.qty || 1,
        width: rest.width || 768,
        height: rest.height || 1024,
        gen_model: rest.genModel || 0,
        track_data: rest.trackData || "{}",
        user_data: rest.userData || "{}"
      },
      video: {
        prompt: prompt,
        qty: rest.qty || 1,
        duration: rest.duration || 5,
        ratio: rest.ratio || "9:16",
        resolution: rest.resolution || "720p",
        add_bgm: rest.addBgm ?? false,
        idle: rest.idle || 0,
        mirror_control: rest.mirrorControl || {},
        track_data: rest.trackData || "{}"
      },
      music: {
        prompt: prompt,
        qty: rest.qty || 1,
        duration: rest.duration || 30,
        track_data: rest.trackData || "{}",
        user_data: rest.userData || "{}"
      },
      chat: {
        prompt: prompt,
        chat_session_id: rest.sessionId || `${Date.now()}`,
        page_code: rest.pageCode || "tomoviee_refer_image_to_image",
        refer_files: fileIds.map(id => ({
          file_id: id
        }))
      }
    };
    const endpoint = endpoints[mode];
    const body = bodies[mode];
    try {
      console.log("[GENERATE] Request...");
      if (mode === "chat") {
        const spaceId = this.spaceId || this.uid || "";
        const {
          data
        } = await axios.post(`${this.baseUrl}/${endpoint}`, body, {
          headers: {
            ...this.getHeaders(),
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            authorization: `Bearer ${tkn}`,
            "x-space-id": spaceId
          },
          responseType: "stream"
        });
        console.log("[GENERATE] Streaming chat...");
        return new Promise((resolve, reject) => {
          let fullText = "";
          let chunks = 0;
          let lastData = null;
          data.on("data", chunk => {
            const parsed = this.parseStream(chunk);
            fullText += parsed.result;
            chunks += parsed.chunks;
            if (parsed.raw) lastData = parsed.raw;
          });
          data.on("end", () => {
            console.log("[GENERATE] Chat complete");
            resolve({
              success: true,
              result: fullText,
              chunks: chunks,
              code: lastData?.code ?? 0,
              msg: lastData?.msg ?? "",
              data: lastData,
              token: tkn
            });
          });
          data.on("error", err => {
            console.error("[GENERATE] Stream error:", err.message);
            reject({
              success: false,
              error: "Stream error",
              details: err.message
            });
          });
        });
      }
      const {
        data
      } = await axios.post(`${this.baseUrl}/${endpoint}`, body, {
        headers: {
          ...this.getHeaders(),
          "Content-Type": "application/json",
          authorization: `Bearer ${tkn}`,
          "x-space-id": this.spaceId || this.uid || ""
        }
      });
      const parsed = this.parseJson(data);
      console.log("[GENERATE] Sukses");
      return {
        success: true,
        ...parsed,
        token: tkn,
        email: this.email,
        pass: this.pass
      };
    } catch (e) {
      console.error("[GENERATE] Error:", e.message);
      return {
        success: false,
        error: "Request gagal",
        details: e.message,
        response: e.response?.data
      };
    }
  }
  async status({
    token,
    mode = "list",
    taskId,
    taskIds,
    page,
    size,
    ...rest
  } = {}) {
    if (!mode) {
      return {
        success: false,
        error: 'Parameter "mode" wajib diisi'
      };
    }
    const validModes = ["task", "list", "result"];
    if (!validModes.includes(mode)) {
      return {
        success: false,
        error: `Mode tidak valid. Gunakan: ${validModes.join(", ")}`
      };
    }
    if (mode === "task" && !taskId) {
      return {
        success: false,
        error: 'Parameter "taskId" wajib untuk mode "task"'
      };
    }
    if (mode === "result" && !taskIds) {
      return {
        success: false,
        error: 'Parameter "taskIds" wajib untuk mode "result"'
      };
    }
    const authResult = await this.ensureAuth(token);
    if (!authResult.success) return authResult;
    const tkn = authResult.token;
    if (mode === "task") {
      try {
        console.log("[STATUS] Checking task...");
        const spaceId = this.spaceId || this.uid || "";
        const {
          data
        } = await axios.get(`${this.baseUrl}/task/${taskId}`, {
          headers: {
            ...this.getHeaders(),
            authorization: `Bearer ${tkn}`,
            "x-space-id": spaceId
          }
        });
        const parsed = this.parseJson(data);
        return {
          success: true,
          data: parsed
        };
      } catch (e) {
        console.error("[STATUS] Error:", e.message);
        return {
          success: false,
          error: "Request gagal",
          details: e.message
        };
      }
    }
    if (mode === "result") {
      try {
        console.log("[STATUS] Getting result...");
        const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
        const spaceId = this.spaceId || this.uid || "";
        const {
          data
        } = await axios.post(`${this.baseUrl}/task/result`, {
          pid: 20395,
          task_ids: ids,
          task_type: rest.taskType || 1
        }, {
          headers: {
            ...this.getHeaders(),
            "Content-Type": "application/json",
            authorization: `Bearer ${tkn}`,
            "x-space-id": spaceId
          }
        });
        const parsed = this.parseJson(data);
        return {
          success: true,
          data: parsed
        };
      } catch (e) {
        console.error("[STATUS] Error:", e.message);
        return {
          success: false,
          error: "Request gagal",
          details: e.message
        };
      }
    }
    if (mode === "list") {
      try {
        console.log("[STATUS] Fetching list...");
        const p = page || 1;
        const s = size || 20;
        const spaceId = this.spaceId || this.uid || "";
        const {
          data
        } = await axios.get(`${this.baseUrl}/task?page=${p}&page_size=${s}&request_type=task_list`, {
          headers: {
            ...this.getHeaders(),
            authorization: `Bearer ${tkn}`,
            "x-space-id": spaceId
          }
        });
        const parsed = this.parseJson(data);
        return {
          success: true,
          data: parsed
        };
      } catch (e) {
        console.error("[STATUS] Error:", e.message);
        return {
          success: false,
          error: "Request gagal",
          details: e.message
        };
      }
    }
  }
  parseStream(chunk) {
    const lines = chunk.toString().split("\n").filter(l => l.trim());
    const results = [];
    let lastParsed = null;
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6));
          const parsed = this.parseJson(json);
          const content = parsed?.data?.result?.[0]?.content;
          if (content) {
            results.push(content);
          }
          lastParsed = parsed;
        } catch (e) {
          console.error("[STREAM] Parse error:", e.message);
        }
      }
    }
    return {
      result: results.join(""),
      code: lastParsed?.code ?? null,
      msg: lastParsed?.msg ?? "",
      chunks: results.length,
      raw: lastParsed
    };
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
      actions: ["generate", "status"]
    });
  }
  const api = new ToMoviee();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'"
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.token) {
          return res.status(400).json({
            error: "Parameter 'token' wajib diisi untuk action 'status'"
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
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