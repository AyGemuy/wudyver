import axios from "axios";
import FormData from "form-data";
class DreemyAI {
  constructor() {
    this.base = "https://www.dreemy.ai";
    this.token = null;
    this.finger = this.genFinger();
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: this.base,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-language": "id",
      "x-platform": "web",
      "x-version": "999.0.0",
      "x-finger": this.finger
    };
  }
  genFinger() {
    try {
      const rand = () => Math.random().toString(16).slice(2);
      const components = {
        userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        language: "id-ID",
        colorDepth: 24,
        deviceMemory: 4,
        hardwareConcurrency: 8,
        screenResolution: [1920, 1080],
        timezone: "Asia/Makassar",
        platform: "Linux armv81",
        vendor: "Google Inc.",
        timestamp: Date.now(),
        random: rand()
      };
      const str = Object.keys(components).sort().map(k => `${k}:${JSON.stringify(components[k])}`).join("|");
      return this.murmur(str);
    } catch (e) {
      console.error("[ERROR] genFinger:", e?.message);
      return this.genRandom();
    }
  }
  genRandom() {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    return Array(32).fill(0).map(hex).join("");
  }
  murmur(str, seed = 0) {
    const buf = Buffer.from(str, "utf8");
    let h1 = seed;
    const c1 = 3432918353;
    const c2 = 461845907;
    for (let i = 0; i < buf.length - 3; i += 4) {
      let k1 = buf[i] | buf[i + 1] << 8 | buf[i + 2] << 16 | buf[i + 3] << 24;
      k1 = Math.imul(k1, c1);
      k1 = k1 << 15 | k1 >>> 17;
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
      h1 = h1 << 13 | h1 >>> 19;
      h1 = Math.imul(h1, 5) + 3864292196;
    }
    h1 ^= buf.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 2246822507);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 3266489909);
    h1 ^= h1 >>> 16;
    return (h1 >>> 0).toString(16).padStart(8, "0") + this.genRandom().slice(0, 24);
  }
  async ensure() {
    if (this.token) return this.token;
    try {
      console.log("[AUTH] Creating guest account...");
      const {
        data: guest
      } = await axios.post(`${this.base}/api/auth/createGuest`, {}, {
        headers: {
          ...this.headers,
          "content-length": "0"
        }
      });
      const {
        guestUid,
        guestKey
      } = guest?.data || {};
      if (!guestUid || !guestKey) {
        throw new Error("Failed to create guest account");
      }
      console.log("[AUTH] Guest created:", guestUid);
      console.log("[AUTH] Getting account info...");
      await axios.get(`${this.base}/api/auth/getAccount`, {
        headers: {
          ...this.headers,
          "x-no-handle": "true"
        }
      });
      console.log("[AUTH] Logging in as guest...");
      const {
        data: login
      } = await axios.post(`${this.base}/api/auth/loginByGuest`, {
        guestUid: guestUid,
        guestKey: guestKey
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      this.token = login?.data?.token || login?.data?.idToken || null;
      console.log("[AUTH] Token obtained:", this.token ? "OK" : "FAIL");
      return this.token;
    } catch (e) {
      console.error("[ERROR] ensure:", e?.response?.data || e?.message);
      throw e;
    }
  }
  async upload(media, token) {
    try {
      const t = token || await this.ensure();
      console.log("[UPLOAD] Processing media...");
      let buffer;
      if (Buffer.isBuffer(media)) {
        buffer = media;
      } else if (media.startsWith("http")) {
        const {
          data
        } = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(data);
      } else if (media.startsWith("data:")) {
        buffer = Buffer.from(media.split(",")[1], "base64");
      } else {
        buffer = Buffer.from(media, "base64");
      }
      const form = new FormData();
      form.append("file", buffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      const {
        data
      } = await axios.post(`${this.base}/api/upload/uploadTempFile`, form, {
        headers: {
          ...this.headers,
          "x-auth-token": t,
          ...form.getHeaders()
        }
      });
      console.log("[UPLOAD] URL:", data?.data);
      return data?.data;
    } catch (e) {
      console.error("[ERROR] upload:", e?.response?.data || e?.message);
      throw e;
    }
  }
  async createVideo({
    token,
    image,
    prompt,
    resolution = "480p",
    length = 5,
    permission = "2",
    extraImage = ""
  }) {
    try {
      const t = token || await this.ensure();
      let baseImage = "";
      if (image) {
        if (!image.startsWith("http")) {
          baseImage = await this.upload(image, t);
        } else {
          baseImage = image;
        }
      }
      console.log("[VIDEO] Creating AI video...");
      console.log("[VIDEO] Prompt:", prompt);
      console.log("[VIDEO] Resolution:", resolution);
      console.log("[VIDEO] Has image:", !!baseImage);
      const {
        data
      } = await axios.post(`${this.base}/api/aiVideo/createAiVideo`, {
        baseImage: baseImage,
        extraImage: extraImage,
        prompt: prompt,
        resolution: resolution,
        length: length,
        permission: permission
      }, {
        headers: {
          ...this.headers,
          "x-auth-token": t,
          "content-type": "application/json"
        }
      });
      const result = data?.data;
      console.log("[VIDEO] Video created (no polling needed)");
      return {
        token: t,
        ...result
      };
    } catch (e) {
      console.error("[ERROR] createVideo:", e?.response?.data || e?.message);
      throw e;
    }
  }
  async checkStatus({
    token,
    jobId,
    scene = "2"
  }) {
    try {
      const t = token || await this.ensure();
      const {
        data
      } = await axios.post(`${this.base}/api/aiVideo/checkJobStatus`, {
        scene: scene,
        jobIds: Array.isArray(jobId) ? jobId : [jobId]
      }, {
        headers: {
          ...this.headers,
          "x-auth-token": t,
          "content-type": "application/json"
        }
      });
      const result = data?.data;
      return {
        token: t,
        ...result
      };
    } catch (e) {
      console.error("[ERROR] checkStatus:", e?.response?.data || e?.message);
      throw e;
    }
  }
  async searchModels({
    token,
    keyword = "",
    pageNo = 1,
    pageSize = 30,
    sortColumn = "popularity",
    sortType = "desc",
    category = ""
  }) {
    try {
      const t = token || await this.ensure();
      console.log("[SEARCH] Searching models:", keyword || "all");
      const params = {
        pageNo: pageNo,
        pageSize: pageSize,
        sortColumn: sortColumn,
        sortType: sortType
      };
      if (keyword) params.keyword = keyword;
      if (category) params.category = category;
      const {
        data
      } = await axios.get(`${this.base}/api/aiModel/list`, {
        params: params,
        headers: {
          ...this.headers,
          "x-auth-token": t
        }
      });
      const result = data?.data;
      return {
        token: t,
        ...result
      };
    } catch (e) {
      console.error("[ERROR] searchModels:", e?.response?.data || e?.message);
      throw e;
    }
  }
  async getMyVideos({
    token,
    pageNo = 1,
    pageSize = 20,
    scene = "2"
  }) {
    try {
      const t = token || await this.ensure();
      console.log("[MY VIDEOS] Getting user videos...");
      const {
        data
      } = await axios.post(`${this.base}/api/aiVideo/myAiVideos`, {
        pageNo: pageNo,
        pageSize: pageSize,
        scene: scene
      }, {
        headers: {
          ...this.headers,
          "x-auth-token": t,
          "content-type": "application/json"
        }
      });
      const result = data?.data;
      return {
        token: t,
        ...result
      };
    } catch (e) {
      console.error("[ERROR] getMyVideos:", e?.response?.data || e?.message);
      throw e;
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
      actions: ["create", "status", "upload", "search", "myvideos"]
    });
  }
  const api = new DreemyAI();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'create'."
          });
        }
        response = await api.createVideo(params);
        break;
      case "status":
        if (!params.jobId) {
          return res.status(400).json({
            error: "Parameter 'jobId' wajib diisi untuk action 'status'."
          });
        }
        response = await api.checkStatus(params);
        break;
      case "upload":
        const mediaFile = params.image || params.media;
        if (!mediaFile) {
          return res.status(400).json({
            error: "Parameter 'image' atau 'media' wajib diisi untuk action 'upload'."
          });
        }
        const url = await api.upload(mediaFile, params.token);
        response = {
          token: params.token || api.token,
          data: url
        };
        break;
      case "search":
        response = await api.searchModels(params);
        break;
      case "myvideos":
        response = await api.getMyVideos(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["create", "status", "upload", "search", "myvideos"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}