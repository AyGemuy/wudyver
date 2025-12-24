import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
import FormData from "form-data";
class GenZoneAPI {
  constructor() {
    this.baseURL = "https://api.genzone.ai";
    this.mailURL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.deviceId = this._genId();
    this.pwd = "cU92zVTL4tUv1P4o0DgcDepTLjMe9lhvk92PGt21issdqrl3BTpWYZwQKpQQIiwQshaV5evPhBVS4oADFMRU7tURXJffi3d%2BaRDm%2F4DiMVUjUD81OaBI5Z5ZCjfScXzsxVjbm8ucqFnxbc7454pnj5MO8%2B%2BpkLTD%2FFYRKfkBRvM%3D";
    this.token = null;
    this.userId = null;
    this.email = null;
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
  _genId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  _headers(token = this.token, deviceId = this.deviceId) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://func.genzone.ai",
      referer: "https://func.genzone.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-request-with": "XMLHttpRequest",
      ...SpoofHead()
    };
    if (deviceId) headers["x-device-id"] = deviceId;
    if (token) headers["authorization"] = token;
    return headers;
  }
  async _getImg(url) {
    try {
      console.log(`📥 Fetching image: ${url}`);
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      console.log(`✅ Image fetched: ${res.data.length} bytes`);
      return Buffer.from(res.data);
    } catch (err) {
      console.error(`❌ Failed to fetch image:`, err.message);
      throw err;
    }
  }
  _getExt(url, buffer) {
    if (url) {
      const ext = url.split(".").pop().split("?")[0].toLowerCase();
      if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
        return ext === "jpg" ? "jpeg" : ext;
      }
    }
    if (buffer) {
      const header = buffer.toString("hex", 0, 4).toUpperCase();
      if (header.startsWith("FFD8")) return "jpeg";
      if (header.startsWith("8950")) return "png";
      if (header.startsWith("5249")) return "webp";
    }
    return "jpeg";
  }
  _getMime(ext) {
    const types = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp"
    };
    return types[ext] || "image/jpeg";
  }
  async createMail() {
    try {
      console.log("📧 Creating temp email...");
      const res = await axios.get(`${this.mailURL}?action=create`);
      this.email = res.data.email;
      console.log(`✅ Email created: ${this.email}`);
      return this.email;
    } catch (err) {
      console.error("❌ Failed to create email:", err.message);
      throw err;
    }
  }
  async getOtp(maxTries = 60, delay = 3e3) {
    try {
      console.log("🔍 Checking for OTP...");
      for (let i = 0; i < maxTries; i++) {
        try {
          const res = await axios.get(`${this.mailURL}?action=message&email=${this.email}`);
          if (res.data.data?.length > 0) {
            const content = res.data.data[0].text_content;
            const match = content.match(/(\d{6})/);
            if (match) {
              console.log(`✅ OTP found: ${match[1]}`);
              return match[1];
            }
          }
          console.log(`⏳ Try ${i + 1}: No OTP, retrying...`);
          await new Promise(r => setTimeout(r, delay));
        } catch (err) {
          console.error(`⚠️ OTP check error (${i + 1}):`, err.message);
        }
      }
      throw new Error("OTP not found after maximum retries");
    } catch (err) {
      console.error("❌ Failed to get OTP:", err.message);
      throw err;
    }
  }
  async reqCode() {
    try {
      console.log("📨 Requesting verification code...");
      const data = `bizType=0&email=${encodeURIComponent(this.email)}`;
      const res = await axios.post(`${this.baseURL}/web/verification-codes/email?locale=en`, data, {
        headers: this._headers()
      });
      console.log("✅ Verification code requested");
      return res.data;
    } catch (err) {
      console.error("❌ Failed to request code:", err.response?.data || err.message);
      throw err;
    }
  }
  async register(otp) {
    try {
      console.log("👤 Registering user...");
      const data = `code=${otp}&email=${encodeURIComponent(this.email)}&pwd=${this.pwd}&utm=utm_source%3D%26cp_id%3D`;
      const res = await axios.post(`${this.baseURL}/web/register?utm_source=&cp_id=&locale=en`, data, {
        headers: this._headers()
      });
      console.log("📋 Registration response:", res.data);
      if (res.data.success && res.data.data?.token) {
        this.token = res.data.data.token;
        this.userId = res.data.data.userId;
        console.log("✅ Registration successful");
        return res.data;
      }
      if (res.data.success) {
        console.log("⚠️ Registration OK but trying alt method...");
        return await this._altReg(otp);
      }
      throw new Error(`Registration failed: ${res.data.errorMsg}`);
    } catch (err) {
      console.error("❌ Registration failed:", err.response?.data || err.message);
      try {
        return await this._altReg(otp);
      } catch (altErr) {
        throw new Error(`Both registration methods failed: ${err.message}`);
      }
    }
  }
  async _altReg(otp) {
    try {
      console.log("🔄 Trying alternative registration...");
      const data = `code=${otp}&email=${encodeURIComponent(this.email)}&pwd=${this.pwd}&utm=utm_source%3D%26cp_id%3D`;
      const res = await axios.post(`${this.baseURL}/web/register?utm_source=&cp_id=&locale=en`, data, {
        headers: this._headers()
      });
      console.log("📋 Alt registration response:", res.data);
      if (res.data.success) {
        const token = res.data.data?.token || res.data.data?.authorization || res.data.token;
        if (token) {
          this.token = token;
          this.userId = res.data.data.userId;
          console.log("✅ Alt registration successful");
          return res.data;
        }
        return await this._postRegLogin();
      }
      throw new Error(`Alt registration failed: ${res.data.errorMsg}`);
    } catch (err) {
      console.error("❌ Alt registration failed:", err.response?.data || err.message);
      throw err;
    }
  }
  async _postRegLogin() {
    try {
      console.log("🔐 Post-registration login...");
      const data = `email=${encodeURIComponent(this.email)}&pwd=${this.pwd}`;
      const res = await axios.post(`${this.baseURL}/web/login?locale=en`, data, {
        headers: this._headers()
      });
      if (res.data.success && res.data.data?.token) {
        this.token = res.data.data.token;
        this.userId = res.data.data.userId;
        console.log("✅ Login successful");
        return res.data;
      }
      throw new Error("Login failed - no token");
    } catch (err) {
      console.error("❌ Login failed:", err.response?.data || err.message);
      throw err;
    }
  }
  async getSign(buffer, ext = "jpeg", fileType = "IMAGE2VIDEO") {
    try {
      console.log(`📝 Getting upload signature for ${fileType}...`);
      const data = `fileType=${fileType}&fileSize=${buffer.length}&extension=${ext}`;
      const res = await axios.post(`${this.baseURL}/web/users/me/signatures/-/files?locale=en`, data, {
        headers: this._headers()
      });
      console.log("✅ Upload signature obtained");
      return res.data.data;
    } catch (err) {
      console.error("❌ Failed to get signature:", err.response?.data || err.message);
      throw err;
    }
  }
  async uploadS3(buffer, sign, name = "image.jpg", mime = "image/jpeg") {
    try {
      console.log(`🚀 Uploading to S3: ${name} (${buffer.length} bytes)`);
      const form = new FormData();
      form.append("content-type", mime);
      form.append("Policy", sign.sign.policy);
      form.append("key", sign.sign.key);
      form.append("x-amz-credential", sign.sign.xamzCredential);
      form.append("x-amz-meta-userid", sign.sign.xamzMetaUserid);
      form.append("x-amz-meta-bucket", sign.sign.xamzMetaBucket);
      form.append("x-amz-meta-filetype", sign.sign.xamzMetaFiletype);
      form.append("x-amz-meta-parameters", sign.sign.xamzMetaParamenters);
      form.append("x-amz-algorithm", sign.sign.xamzAlgorithm);
      form.append("x-amz-date", sign.sign.xamzDate);
      form.append("x-amz-signature", sign.sign.xamzSignature);
      form.append("file", buffer, {
        filename: name,
        contentType: mime
      });
      await axios.post(sign.sign.url, form, {
        headers: {
          ...form.getHeaders(),
          Origin: "https://func.genzone.ai",
          Referer: "https://func.genzone.ai/",
          "x-device-id": this.deviceId
        }
      });
      console.log("✅ S3 upload successful");
      return {
        fileId: sign.fileId,
        success: true
      };
    } catch (err) {
      console.error("❌ S3 upload failed:", err.response?.data || err.message);
      throw err;
    }
  }
  async addRes(fileId, category = "IMAGE2VIDEO") {
    try {
      console.log(`📁 Adding resource: ${fileId} (${category})`);
      const data = `category=${category}&sourceType=1&sources%5B0%5D.sourceId=${fileId}&targetBizType=5`;
      const res = await axios.post(`${this.baseURL}/web/users/me/resources/add?locale=en`, data, {
        headers: this._headers()
      });
      const resId = res.data.data[0].id;
      console.log(`✅ Resource added: ${resId}`);
      return resId;
    } catch (err) {
      console.error("❌ Failed to add resource:", err.response?.data || err.message);
      throw err;
    }
  }
  async checkRes(resId, maxTries = 20, delay = 3e3) {
    try {
      console.log(`🔍 Checking resource status: ${resId}`);
      for (let i = 0; i < maxTries; i++) {
        try {
          const res = await axios.get(`${this.baseURL}/web/users/me/resources/processing?locale=en&resourceIds%5B0%5D=${resId}`, {
            headers: this._headers()
          });
          const resource = res.data.data[0];
          console.log(`📊 Resource check ${i + 1}: Status ${resource.status}`);
          if (resource.status === 1) {
            console.log("✅ Resource ready");
            return resource;
          }
          if (resource.status === 3) {
            throw new Error("Resource processing failed");
          }
          await new Promise(r => setTimeout(r, delay));
        } catch (err) {
          console.error(`⚠️ Resource check error (${i + 1}):`, err.message);
        }
      }
      throw new Error("Resource processing timeout");
    } catch (err) {
      console.error("❌ Resource check failed:", err.message);
      throw err;
    }
  }
  async createTask(resId, prompt = "flying", duration = 5, taskType = "image2video") {
    try {
      console.log(`🎬 Creating ${taskType} task: "${prompt}" (${duration}s)`);
      if (!prompt?.trim()) prompt = "moving gently";
      prompt = prompt.trim().replace(/[^\w\s,.-]/g, "").slice(0, 100);
      if (duration < 1 || duration > 10) duration = 5;
      const data = `prompt=${encodeURIComponent(prompt)}&duration=${duration}&resourceId=${resId}`;
      const res = await axios.post(`${this.baseURL}/web/users/me/models/${taskType}/tasks?locale=en`, data, {
        headers: this._headers()
      });
      console.log("📋 Task response:", JSON.stringify(res.data, null, 2));
      if (res.data.success && res.data.data) {
        const taskId = res.data.data.taskId;
        console.log(`✅ Task created: ${taskId}`);
        const taskData = {
          token: this.token,
          deviceId: this.deviceId,
          userId: this.userId,
          taskId: taskId
        };
        const encryptedTaskId = await this.enc(taskData);
        res.data.data.task_id = encryptedTaskId;
        return res.data;
      }
      throw new Error(`Task creation failed: ${res.data.errorMsg}`);
    } catch (err) {
      console.error("❌ Failed to create task:", err.response?.data || err.message);
      throw err;
    }
  }
  async txt2vid({
    prompt,
    duration = 5
  }) {
    try {
      console.log("📝 Starting txt2vid process...");
      if (!prompt?.trim()) {
        throw new Error("Prompt is required for txt2vid");
      }
      prompt = prompt.trim().replace(/[^\w\s,.-]/g, "").slice(0, 100);
      if (duration < 1 || duration > 10) duration = 5;
      await this.createMail();
      await this.reqCode();
      const otp = await this.getOtp();
      await this.register(otp);
      const data = `prompt=${encodeURIComponent(prompt)}&duration=${duration}`;
      const res = await axios.post(`${this.baseURL}/web/users/me/models/text2video/tasks?locale=en`, data, {
        headers: this._headers()
      });
      if (res.data.success && res.data.data) {
        const taskId = res.data.data.taskId;
        console.log(`✅ txt2vid task created: ${taskId}`);
        const taskData = {
          token: this.token,
          deviceId: this.deviceId,
          userId: this.userId,
          taskId: taskId
        };
        const encryptedTaskId = await this.enc(taskData);
        res.data.data.task_id = encryptedTaskId;
        console.log("🎉 txt2vid task submitted!");
        return res.data;
      }
      throw new Error(`txt2vid task creation failed: ${res.data.errorMsg}`);
    } catch (err) {
      console.error("💥 txt2vid failed:", err.message);
      throw err;
    }
  }
  async talk2vid({
    imageUrl,
    prompt: content,
    voiceId = "202411070001"
  }) {
    try {
      console.log("🗣️ Starting talk2vid process...");
      if (!imageUrl || !content?.trim()) {
        throw new Error("imageUrl and content are required for talk2vid");
      }
      let buffer, name = "image.jpg",
        ext = "jpeg";
      if (typeof imageUrl === "string") {
        buffer = await this._getImg(imageUrl);
        name = imageUrl.split("/").pop().split("?")[0] || "image.jpg";
        ext = this._getExt(imageUrl, buffer);
      } else if (Buffer.isBuffer(imageUrl)) {
        buffer = imageUrl;
        ext = this._getExt(null, buffer);
      } else {
        throw new Error("Invalid imageUrl - provide URL string or Buffer");
      }
      const mime = this._getMime(ext);
      await this.createMail();
      await this.reqCode();
      const otp = await this.getOtp();
      await this.register(otp);
      const sign = await this.getSign(buffer, ext, "TALKING_PHOTO");
      const upload = await this.uploadS3(buffer, sign, name, mime);
      const imageFileId = upload.fileId;
      content = content.trim().slice(0, 200);
      const data = `imageFileId=${imageFileId}&content=${encodeURIComponent(content)}&voiceId=${voiceId}`;
      const res = await axios.post(`${this.baseURL}/web/users/me/models/talking-photo/tasks?locale=en`, data, {
        headers: this._headers()
      });
      if (res.data.success && res.data.data) {
        const taskId = res.data.data.taskId;
        console.log(`✅ talk2vid task created: ${taskId}`);
        const taskData = {
          token: this.token,
          deviceId: this.deviceId,
          userId: this.userId,
          taskId: taskId
        };
        const encryptedTaskId = await this.enc(taskData);
        res.data.data.task_id = encryptedTaskId;
        console.log("🎉 talk2vid task submitted!");
        return res.data;
      }
      throw new Error(`talk2vid task creation failed: ${res.data.errorMsg}`);
    } catch (err) {
      console.error("💥 talk2vid failed:", err.message);
      throw err;
    }
  }
  async txt2img({
    prompt: text,
    styleId = "3646703171510769154",
    height = 896,
    width = 512,
    categoryId = 18,
    resultCount = 1
  }) {
    try {
      console.log("🖼️ Starting txt2img process...");
      if (!text?.trim()) {
        throw new Error("Text is required for txt2img");
      }
      text = text.trim().slice(0, 200);
      await this.createMail();
      await this.reqCode();
      const otp = await this.getOtp();
      await this.register(otp);
      const data = `styleId=${styleId}&height=${height}&width=${width}&text=${encodeURIComponent(text)}&categoryId=${categoryId}&resultCount=${resultCount}`;
      const res = await axios.post(`${this.baseURL}/web/users/me/models/text2img/tasks?locale=en`, data, {
        headers: this._headers()
      });
      if (res.data.success && res.data.data) {
        const taskId = res.data.data.taskId;
        console.log(`✅ txt2img task created: ${taskId}`);
        const taskData = {
          token: this.token,
          deviceId: this.deviceId,
          userId: this.userId,
          taskId: taskId
        };
        const encryptedTaskId = await this.enc(taskData);
        res.data.data.task_id = encryptedTaskId;
        console.log("🎉 txt2img task submitted!");
        return res.data;
      }
      throw new Error(`txt2img task creation failed: ${res.data.errorMsg}`);
    } catch (err) {
      console.error("💥 txt2img failed:", err.message);
      throw err;
    }
  }
  async img2vid({
    imageUrl,
    prompt = "flying",
    duration = 5
  }) {
    try {
      console.log("🚀 Starting img2vid process...");
      let buffer, name = "image.jpg",
        ext = "jpeg";
      if (typeof imageUrl === "string") {
        buffer = await this._getImg(imageUrl);
        name = imageUrl.split("/").pop().split("?")[0] || "image.jpg";
        ext = this._getExt(imageUrl, buffer);
      } else if (Buffer.isBuffer(imageUrl)) {
        buffer = imageUrl;
        ext = this._getExt(null, buffer);
      } else {
        throw new Error("Invalid imageUrl - provide URL string or Buffer");
      }
      const mime = this._getMime(ext);
      console.log(`📊 Image: ${buffer.length} bytes, ${ext}, ${mime}`);
      await this.createMail();
      await this.reqCode();
      const otp = await this.getOtp();
      await this.register(otp);
      const sign = await this.getSign(buffer, ext);
      const upload = await this.uploadS3(buffer, sign, name, mime);
      const resId = await this.addRes(upload.fileId);
      await this.checkRes(resId);
      const task = await this.createTask(resId, prompt, duration, "image2video");
      console.log("🎉 img2vid task submitted!");
      return task;
    } catch (err) {
      console.error("💥 img2vid failed:", err.message);
      throw err;
    }
  }
  async status({
    task_id
  }) {
    try {
      console.log("🔍 Checking status...");
      const taskData = await this.dec(task_id);
      const {
        token,
        deviceId,
        taskId
      } = taskData;
      console.log(`📋 Decrypted taskId: ${taskId}`);
      const headers = this._headers(token, deviceId);
      let res;
      try {
        res = await axios.get(`${this.baseURL}/web/users/me/tasks/processing?locale=en&taskIds%5B0%5D=${taskId}`, {
          headers: headers
        });
        console.log("📋 Response from processing endpoint:", JSON.stringify(res.data, null, 2));
        if (res.data) {
          console.log("✅ Task completed, fetching full details.");
          const detailRes = await axios.get(`${this.baseURL}/web/users/me/tasks/${taskId}?locale=en`, {
            headers: headers
          });
          if (detailRes.data) {
            return detailRes.data;
          } else {
            throw new Error(`Failed to get final task details: ${detailRes.data.errorMsg}`);
          }
        } else if (res.data) {
          return res.data;
        } else {
          throw new Error("Task not found or processing response is empty.");
        }
      } catch (processingErr) {
        console.warn("⚠️ Could not fetch from processing endpoint, trying detail endpoint directly.");
        try {
          res = await axios.get(`${this.baseURL}/web/users/me/tasks/${taskId}?locale=en`, {
            headers: headers
          });
          console.log("📋 Response from detail endpoint:", JSON.stringify(res.data, null, 2));
          if (res.data) {
            return res.data;
          } else {
            throw new Error(`Failed to get task details: ${res.data.errorMsg}`);
          }
        } catch (detailErr) {
          throw new Error(`Failed to get task status from both endpoints: ${detailErr.message}`);
        }
      }
    } catch (err) {
      console.error("❌ Status check failed:", err.message);
      return {
        success: false,
        errorCode: 1,
        data: null,
        errorMsg: err.message
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
      error: "Paramenter 'action' wajib ada."
    });
  }
  const api = new GenZoneAPI();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Untuk 'img2vid', parameter 'prompt' dan 'imageUrl' wajib ada."
          });
        }
        response = await api.img2vid(params);
        return res.status(200).json(response);
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Untuk 'txt2vid', parameter 'prompt' wajib ada."
          });
        }
        response = await api.txt2vid(params);
        return res.status(200).json(response);
      case "talk2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Untuk 'talk2vid', parameter 'prompt' dan 'imageUrl' wajib ada."
          });
        }
        response = await api.talk2vid(params);
        return res.status(200).json(response);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Untuk 'txt2img', parameter 'prompt' wajib ada."
          });
        }
        response = await api.txt2img(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Untuk 'status', parameter 'task_id' wajib ada."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Aksi tidak valid: '${action}'. Aksi yang didukung adalah 'img2vid', 'txt2vid', 'talk2vid', 'txt2img', dan 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal server."
    });
  }
}