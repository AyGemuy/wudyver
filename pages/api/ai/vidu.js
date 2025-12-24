import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class ViduAPI {
  constructor() {
    this.baseURL = "https://service.vidu.com";
    this.emailService = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.wafTokenURL = "https://aa91ab2ba082.772a7f4a.ap-southeast-3.token.awswaf.com/aa91ab2ba082";
    this.headers = {
      accept: "*/*",
      "accept-language": "en",
      "content-type": "application/json",
      origin: "https://www.vidu.com",
      priority: "u=1, i",
      referer: "https://www.vidu.com/",
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "x-app-version": "-",
      "x-platform": "web",
      ...SpoofHead()
    };
    this.jwt = null;
    this.userId = null;
    this.wafToken = null;
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
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async _createTempEmail() {
    try {
      const response = await axios.get(`${this.emailService}?action=create`);
      return response.data.email;
    } catch (error) {
      throw new Error(`Failed to create temp email: ${error.message}`);
    }
  }
  async _getEmailMessages(email) {
    try {
      const response = await axios.get(`${this.emailService}?action=message&email=${email}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get email messages: ${error.message}`);
    }
  }
  _extractAuthCode(emailData) {
    if (emailData.data && emailData.data.length > 0) {
      const textContent = emailData.data[0].text_content;
      const codeMatch = textContent.match(/(\d{6})/);
      if (codeMatch) {
        return codeMatch[1];
      }
    }
    return null;
  }
  async _getWafChallenge() {
    try {
      const response = await axios.get(`${this.wafTokenURL}/inputs?client=browser`, {
        headers: {
          ...this.headers,
          "sec-fetch-site": "cross-site"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get WAF challenge: ${error.message}`);
    }
  }
  async _verifyWafChallenge(challengeData, solution = "2") {
    try {
      const payload = {
        challenge: challengeData.challenge,
        solution: solution,
        signals: [{
          name: "Zoey",
          value: {
            Present: "jG+QuTT4j/80zomC::11048be2c055b8735690e1a7c16a0e5f::"
          }
        }],
        checksum: "A18890D3",
        existing_token: this.wafToken || "daf75efa-c1fd-4091-88fc-4f0877241fbd:GgoAlptNKU1fAAAA:qMUtU/==",
        client: "Browser",
        domain: "www.vidu.com",
        metrics: []
      };
      const response = await axios.post(`${this.wafTokenURL}/verify`, payload, {
        headers: {
          ...this.headers,
          "content-type": "text/plain;charset=UTF-8",
          "sec-fetch-site": "cross-site"
        }
      });
      this.wafToken = response.data.token;
      return response.data;
    } catch (error) {
      throw new Error(`Failed to verify WAF challenge: ${error.message}`);
    }
  }
  async _sendAuthCode(email) {
    try {
      const requestId = this.generateUUID();
      await axios.post(`${this.baseURL}/iam/v1/users/send-auth-code`, {
        channel: "email",
        receiver: email,
        purpose: "login",
        locale: "en"
      }, {
        headers: {
          ...this.headers,
          "x-request-id": requestId,
          "x-aws-waf-token": this.wafToken
        }
      });
    } catch (error) {
      throw new Error(`Failed to send auth code: ${error.message}`);
    }
  }
  async _login(email, authCode) {
    try {
      const deviceId = `DEVICE_${this.generateUUID()}`;
      const requestId = this.generateUUID();
      const response = await axios.post(`${this.baseURL}/iam/v1/users/login`, {
        id_type: "email",
        identity: email,
        auth_type: "authcode",
        credential: authCode,
        device_id: deviceId,
        invite_code: ""
      }, {
        headers: {
          ...this.headers,
          "x-request-id": requestId,
          "x-aws-waf-token": this.wafToken
        }
      });
      if (!response.data || !response.data.user) {
        throw new Error("Login response does not have expected user data.");
      }
      this.jwt = response.data.token;
      this.userId = response.data.user.id;
      return response.data;
    } catch (error) {
      throw new Error(`Failed to login: ${error.message}`);
    }
  }
  async _subscribeEmail(email) {
    try {
      const requestId = this.generateUUID();
      await axios.post(`${this.baseURL}/iam/v1/users/subscribe-email`, {
        email: email,
        first_name: "Jhon",
        last_name: "Doe"
      }, {
        headers: {
          ...this.headers,
          "x-request-id": requestId,
          "x-aws-waf-token": this.wafToken,
          Cookie: `JWT=${this.jwt}; SSUID=${this.userId}`
        }
      });
    } catch (error) {
      throw new Error(`Failed to subscribe email: ${error.message}`);
    }
  }
  async _ensureAuth() {
    if (this.jwt && this.wafToken) {
      console.log("[LOG] Otentikasi sudah ada, dilewati.");
      return;
    }
    console.log("--- Memulai Otentikasi Otomatis ---");
    try {
      const tempEmail = await this._createTempEmail();
      const challengeData = await this._getWafChallenge();
      await this._verifyWafChallenge(challengeData);
      await this._sendAuthCode(tempEmail);
      let authCode;
      let attempts = 0;
      const maxAttempts = 60;
      while (!authCode && attempts < maxAttempts) {
        await this.sleep(3e3);
        const emailData = await this._getEmailMessages(tempEmail);
        authCode = this._extractAuthCode(emailData);
        attempts++;
        if (!authCode) console.log(`[LOG] Kode tidak ditemukan, mencoba lagi... (Percobaan ${attempts})`);
      }
      if (!authCode) throw new Error("Kode otentikasi tidak ditemukan di email setelah beberapa percobaan.");
      await this._login(tempEmail, authCode);
      await this._subscribeEmail(tempEmail);
      console.log("--- Otentikasi Berhasil ---");
    } catch (error) {
      console.error("[ERROR] Otentikasi gagal:", error.message);
      throw error;
    }
  }
  async _upload(metadata) {
    try {
      const requestId = this.generateUUID();
      const response = await axios.post(`${this.baseURL}/tools/v1/files/uploads`, {
        metadata: metadata,
        scene: "vidu"
      }, {
        headers: {
          ...this.headers,
          "x-request-id": requestId,
          "x-aws-waf-token": this.wafToken,
          Cookie: `JWT=${this.jwt}; SSUID=${this.userId}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get upload URL: ${error.message}`);
    }
  }
  async _uploadFileToPresignedUrl(url, buffer, contentType) {
    try {
      const response = await axios.put(url, buffer, {
        headers: {
          "Content-Type": contentType
        }
      });
      const etag = response.headers.etag;
      if (!etag) throw new Error("ETag tidak ditemukan di header respons.");
      return etag.replace(/"/g, "");
    } catch (error) {
      throw new Error(`Failed to upload file to presigned URL: ${error.message}`);
    }
  }
  async _finishUpload(uploadId, etag) {
    try {
      const requestId = this.generateUUID();
      const response = await axios.put(`${this.baseURL}/tools/v1/files/uploads/${uploadId}/finish`, {
        etag: etag,
        id: uploadId
      }, {
        headers: {
          ...this.headers,
          "x-request-id": requestId,
          "x-aws-waf-token": this.wafToken,
          Cookie: `JWT=${this.jwt}; SSUID=${this.userId}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to finish upload: ${error.message}`);
    }
  }
  async _uploadImageFromUrl(imageUrl) {
    try {
      const {
        id: uploadId,
        put_url
      } = await this._upload();
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      const contentType = imageResponse.headers["content-type"];
      const etag = await this._uploadFileToPresignedUrl(put_url, imageBuffer, contentType);
      const finishResult = await this._finishUpload(uploadId, etag);
      return finishResult;
    } catch (error) {
      throw new Error(`Failed to upload image from URL: ${error.message}`);
    }
  }
  async _createVideoTask(taskType, prompts, settings = {}) {
    try {
      const defaultSettings = {
        style: "general",
        duration: "4",
        resolution: "512",
        movement_amplitude: "auto",
        aspect_ratio: "16:9",
        sample_count: 1,
        schedule_mode: "normal",
        model_version: "2.0",
        use_trial: false
      };
      const requestId = this.generateUUID();
      const response = await axios.post(`${this.baseURL}/vidu/v1/tasks`, {
        input: {
          prompts: prompts,
          editor_mode: "normal",
          enhance: true
        },
        type: taskType,
        settings: {
          ...defaultSettings,
          ...settings
        }
      }, {
        headers: {
          ...this.headers,
          "x-request-id": requestId,
          "x-aws-waf-token": this.wafToken,
          Cookie: `JWT=${this.jwt}; SSUID=${this.userId}`
        }
      });
      const task_id = response.data.id;
      if (!task_id) throw new Error("Task ID tidak ditemukan dalam respons.");
      const encryptedData = {
        jwt: this.jwt,
        userId: this.userId,
        id: task_id
      };
      const encryptedId = await this.enc(encryptedData);
      console.log(`[LOG] Tugas video ${taskType} berhasil dibuat. ID terenkripsi: ${encryptedId}`);
      return encryptedId;
    } catch (error) {
      throw new Error(`Failed to create video task (${taskType}): ${error.message}`);
    }
  }
  async txt2vid({
    prompt,
    ...rest
  }) {
    try {
      await this._ensureAuth();
      console.log("--- Memulai Proses Txt2Vid ---");
      const prompts = [{
        type: "text",
        content: prompt
      }];
      const defaultSettings = {
        style: "general",
        duration: "4",
        resolution: "512",
        movement_amplitude: "auto",
        aspect_ratio: "9:16",
        sample_count: 1,
        schedule_mode: "normal",
        model_version: "1.5",
        use_trial: false
      };
      const settings = {
        ...defaultSettings,
        ...rest
      };
      const encryptedId = await this._createVideoTask("text2video", prompts, settings);
      console.log("[LOG] txt2vid berhasil.");
      return encryptedId;
    } catch (error) {
      console.error("[ERROR] Gagal membuat video txt2vid:", error.message);
      throw error;
    }
  }
  async img2vid({
    imageUrl,
    prompt,
    ...rest
  }) {
    try {
      await this._ensureAuth();
      console.log("--- Memulai Proses Img2Vid ---");
      let allImageUris = [];
      const prompts = [{
        type: "text",
        content: prompt
      }];
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      for (let i = 0; i < imageUrls.length; i++) {
        const uploadResult = await this._uploadImageFromUrl(imageUrls[i]);
        allImageUris.push(uploadResult.uri);
        prompts.push({
          type: "image",
          content: uploadResult.uri,
          src_imgs: allImageUris,
          name: `image${i + 1}`
        });
      }
      const encryptedId = await this._createVideoTask("img2video", prompts, rest);
      console.log("[LOG] img2vid berhasil.");
      return encryptedId;
    } catch (error) {
      console.error("[ERROR] Gagal membuat video img2vid:", error.message);
      throw error;
    }
  }
  async character2vid({
    imageUrl,
    prompt,
    ...rest
  }) {
    try {
      await this._ensureAuth();
      console.log("--- Memulai Proses Character2Vid ---");
      let allImageUris = [];
      const prompts = [{
        type: "text",
        content: prompt
      }];
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      for (let i = 0; i < imageUrls.length; i++) {
        const uploadResult = await this._uploadImageFromUrl(imageUrls[i]);
        allImageUris.push(uploadResult.uri);
        prompts.push({
          type: "image",
          content: uploadResult.uri,
          src_imgs: allImageUris,
          name: `image${i + 1}`
        });
      }
      const encryptedId = await this._createVideoTask("character2video", prompts, rest);
      console.log("[LOG] character2vid berhasil.");
      return encryptedId;
    } catch (error) {
      console.error("[ERROR] Gagal membuat video character2vid:", error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    try {
      console.log(`[LOG] Memeriksa status untuk ID tugas terenkripsi: ${task_id}`);
      const decryptedData = await this.dec(task_id);
      const {
        jwt,
        userId,
        id
      } = decryptedData;
      console.log(`[LOG] ID tugas terdekripsi: ${id}`);
      const statusUrl = `${this.baseURL}/vidu/v1/tasks/${id}`;
      const response = await axios.get(statusUrl, {
        headers: {
          ...this.headers,
          Cookie: `JWT=${jwt}; SSUID=${userId}`
        }
      });
      const task = response.data;
      if (!task) {
        console.warn(`[WARNING] Tugas dengan ID ${id} tidak ditemukan dalam riwayat.`);
        return null;
      }
      console.log(`[LOG] Status tugas ${id}: ${task.state}`);
      return task;
    } catch (error) {
      console.error("[ERROR] Gagal mendapatkan status tugas:", error.message);
      throw error;
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
      error: "Action is required."
    });
  }
  const viduAPI = new ViduAPI();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2vid."
          });
        }
        response = await viduAPI.img2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        response = await viduAPI.txt2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "character2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for character2vid."
          });
        }
        response = await viduAPI.character2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await viduAPI.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'txt2vid', 'character2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}