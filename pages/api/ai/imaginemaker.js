import fetch from "node-fetch";
import crypto from "crypto";
import FormData from "form-data";
import Encoder from "@/lib/encoder";
import PROMPT from "@/configs/ai-prompt";
class AIVideoScraper {
  constructor(token = null, userId = null) {
    this.baseURL = "https://api.imaginemaker.org";
    this.deviceKey = this.generateDeviceKey();
    this.encryptKey = "qwertyuiopasdfghzxcvbnmlkjhgfdsa";
    this.baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      language: "en",
      region: "US",
      "version-code": "1",
      "version-name": "1.0.0",
      android: "10",
      "X-Requested-With": "XMLHttpRequest",
      Origin: "https://imaginemaker.org",
      Referer: "https://imaginemaker.org/"
    };
    this.cachedAuth = token && userId ? {
      token: token,
      userId: userId,
      deviceKey: this.deviceKey
    } : null;
  }
  generateDeviceKey() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
  decryptData(encryptedData) {
    try {
      const encryptedBuffer = Buffer.from(encryptedData, "base64");
      const key = Buffer.from(this.encryptKey, "utf8");
      const decipher = crypto.createDecipheriv("aes-256-ecb", key, null);
      decipher.setAutoPadding(true);
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return JSON.parse(decrypted.toString("utf8"));
    } catch (error) {
      throw new Error("Decrypt failed: " + error.message);
    }
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async login() {
    console.log("🔐 Auto logging in...");
    const payload = {
      deviceKey: this.deviceKey
    };
    const response = await fetch(`${this.baseURL}/api/loginByDeviceKey`, {
      method: "POST",
      headers: this.baseHeaders,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.code === 200 && data.encryptedData) {
      const decrypted = this.decryptData(data.encryptedData);
      this.cachedAuth = {
        token: decrypted.token,
        userId: decrypted.userId,
        deviceKey: this.deviceKey
      };
      console.log("✅ Auto login success, User ID:", decrypted.userId);
      return this.cachedAuth;
    }
    throw new Error("Auto login failed: " + (data.msg || "Unknown error"));
  }
  async ensureAuth() {
    if (this.cachedAuth && this.cachedAuth.token && this.cachedAuth.userId) {
      return this.cachedAuth;
    }
    return await this.login();
  }
  createHeaders(token, userId) {
    return {
      ...this.baseHeaders,
      Authorization: token,
      Token: token,
      "X-Device-ID": this.deviceKey,
      "X-User-ID": userId ? userId.toString() : ""
    };
  }
  async makeRequest(url, options = {}) {
    const auth = await this.ensureAuth();
    const headers = this.createHeaders(auth.token, auth.userId);
    const config = {
      method: "GET",
      headers: headers,
      ...options
    };
    if (config.body && typeof config.body === "object" && !Buffer.isBuffer(config.body)) {
      config.body = JSON.stringify(config.body);
    }
    const response = await fetch(url, config);
    const data = await response.json();
    if (data.code !== 200) {
      throw new Error(data.msg || "Request failed");
    }
    if (data.encryptedData) {
      return this.decryptData(data.encryptedData);
    }
    return data.data || data;
  }
  async txt2vid({
    prompt,
    styleId = null,
    ratio = "16:9",
    quality = "HD",
    openBgm = 0,
    bgm = null
  }) {
    console.log("🎬 Creating text video...");
    const payload = {
      prompt: prompt,
      ratio: ratio,
      quality: quality,
      openBgm: openBgm ? 1 : 0
    };
    if (styleId !== null) {
      payload.styleId = styleId;
    }
    if (openBgm && bgm) {
      payload.bgm = bgm;
    }
    const result = await this.makeRequest(`${this.baseURL}/api/ai/text2video`, {
      method: "POST",
      body: payload
    });
    console.log("✅ Text2Video success");
    const task_id = await this.enc({
      type: 0,
      ...this.cachedAuth,
      ...result
    });
    return {
      task_id: task_id
    };
  }
  async img2vid({
    imageUrl: image,
    prompt = PROMPT.text,
    styleId = null,
    ratio = "16:9",
    quality = "HD",
    openBgm = 0,
    bgm = null
  }) {
    console.log("🎬 Creating image video...");
    await this.ensureAuth();
    const imgUrl = await this.uploadImage(image);
    const payload = {
      imgUrl: imgUrl,
      prompt: prompt,
      ratio: ratio,
      quality: quality,
      openBgm: openBgm ? 1 : 0
    };
    if (styleId !== null) {
      payload.styleId = styleId;
    }
    if (openBgm && bgm) {
      payload.bgm = bgm;
    }
    const result = await this.makeRequest(`${this.baseURL}/api/ai/img2video`, {
      method: "POST",
      body: payload
    });
    console.log("✅ Img2Video success");
    const task_id = await this.enc({
      type: 0,
      ...this.cachedAuth,
      ...result
    });
    return {
      task_id: task_id
    };
  }
  async img2img({
    imageUrl: image,
    templateId = 1
  }) {
    console.log("🎨 Creating image-to-image...");
    await this.ensureAuth();
    const imgUrl = await this.uploadImage(image);
    const payload = {
      imgUrl: imgUrl,
      templateId: templateId
    };
    const result = await this.makeRequest(`${this.baseURL}/api/ai/templateimg2img`, {
      method: "POST",
      body: payload
    });
    console.log("✅ Img2Img success");
    const task_id = await this.enc({
      type: 1,
      ...this.cachedAuth,
      ...result
    });
    return {
      task_id: task_id
    };
  }
  async template2video({
    templateId = 1,
    prompt = PROMPT.text
  }) {
    console.log("🎬 Creating template video...");
    const payload = {
      templateId: templateId
    };
    if (prompt) {
      payload.prompt = prompt;
    }
    const result = await this.makeRequest(`${this.baseURL}/api/ai/template2video`, {
      method: "POST",
      body: payload
    });
    console.log("✅ Template2Video success");
    const task_id = await this.enc({
      type: 0,
      ...this.cachedAuth,
      ...result
    });
    return {
      task_id: task_id
    };
  }
  async template({
    page = 1,
    size = 99,
    categoryId = null
  }) {
    console.log("📋 Getting video template list...");
    let url = `${this.baseURL}/api/videoTemplate/list?page=${page}&size=${size}`;
    if (categoryId !== null) {
      url += `&categoryId=${categoryId}`;
    }
    const result = await this.makeRequest(url);
    console.log("✅ Video templates retrieved");
    return result;
  }
  async templateDetail({
    templateId = 1
  }) {
    console.log("📋 Getting video template detail...");
    const result = await this.makeRequest(`${this.baseURL}/api/videoTemplate/detail?templateId=${templateId}`);
    console.log("✅ Template detail retrieved");
    return result;
  }
  async status({
    task_id,
    page = 1,
    size = 99,
    status = null
  }) {
    console.log("📋 Getting tasks...");
    const dataDec = await this.dec(task_id);
    const {
      type,
      token,
      userId
    } = dataDec;
    this.cachedAuth = {
      ...this.cachedAuth,
      token: token,
      userId: userId
    };
    let url = `${this.baseURL}/api/ai/task/list?page=${page}&size=${size}`;
    if (type !== null) {
      url += `&type=${type}`;
    }
    if (status !== null) {
      url += `&status=${status}`;
    }
    const result = await this.makeRequest(url);
    console.log("✅ Tasks retrieved");
    return result;
  }
  async styles() {
    console.log("🎨 Getting styles...");
    const result = await this.makeRequest(`${this.baseURL}/api/ai/style/list`);
    console.log("✅ Styles retrieved");
    return result;
  }
  async uploadImage(image) {
    const auth = await this.ensureAuth();
    const base64Data = await this.imageToBase64(image);
    const formData = new FormData();
    const buffer = Buffer.from(base64Data, "base64");
    formData.append("file", buffer, {
      filename: "image_" + Date.now() + ".jpg",
      contentType: "image/jpeg"
    });
    const uploadHeaders = {
      ...this.createHeaders(auth.token, auth.userId),
      ...formData.getHeaders()
    };
    delete uploadHeaders["Content-Type"];
    const uploadResponse = await fetch(`${this.baseURL}/api/file/upload`, {
      method: "POST",
      headers: uploadHeaders,
      body: formData
    });
    const uploadData = await uploadResponse.json();
    if (uploadData.code !== 200) {
      throw new Error("uploadImageFile error: " + (uploadData.msg || "Unknown error"));
    }
    return uploadData.data?.url || uploadData.data;
  }
  async imageToBase64(input) {
    if (typeof input === "string" && input.startsWith("data:image")) {
      return input.split(",")[1];
    }
    if (typeof input === "string" && /^[A-Za-z0-9+/=]+$/.test(input)) {
      return input;
    }
    if (typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"))) {
      const response = await fetch(input);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    }
    if (Buffer.isBuffer(input)) {
      return input.toString("base64");
    }
    throw new Error("Unsupported image format");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new AIVideoScraper();
  try {
    let response;
    switch (action) {
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
        break;
      case "template2video":
        if (!params.templateId) {
          return res.status(400).json({
            error: "Parameter 'templateId' wajib diisi untuk action 'template2video'."
          });
        }
        response = await api.template2video(params);
        break;
      case "template":
        response = await api.template(params);
        break;
      case "templateDetail":
        if (!params.templateId) {
          return res.status(400).json({
            error: "Parameter 'templateId' wajib diisi untuk action 'templateDetail'."
          });
        }
        response = await api.templateDetail(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "styles":
        response = await api.styles();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'txt2vid', 'img2vid', 'img2img', 'template2video', 'template', 'templateDetail', 'status', 'styles'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}