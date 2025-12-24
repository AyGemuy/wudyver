import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import ApiKey from "@/configs/api-key";
class FalApi {
  constructor() {
    this.apiKeys = ApiKey.fal || [];
    this.axios = axios.create({
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  async _executeWithRotation(fn) {
    let lastError = null;
    if (!this.apiKeys.length) {
      throw new Error("API Key tidak ditemukan di konfigurasi.");
    }
    for (const key of this.apiKeys) {
      try {
        console.log(`[PROCESS] Mencoba dengan API Key: ${key.substring(0, 8)}...`);
        return await fn(key);
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error || errorData?.detail || error.message || "";
        console.error(`[LOG] Key ${key.substring(0, 8)} gagal. Status: ${status}. Error: ${errorMessage}`);
        const isLocked = errorMessage.toLowerCase().includes("user is locked");
        const isExhausted = errorMessage.toLowerCase().includes("exhausted balance");
        const isRotatableStatus = [401, 402, 403, 429].includes(status);
        if (isRotatableStatus || isLocked || isExhausted) {
          console.warn(`[ROTATE] Key bermasalah (Saldo habis/Locked). Mencoba key berikutnya...`);
          continue;
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Semua API Key gagal. Error terakhir: ${lastError?.response?.data?.error || lastError.message}`);
  }
  async _uploadToFal(imageUrl, key) {
    try {
      console.log("[PROCESS] Memulai proses upload gambar...");
      let buffer, contentType;
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        console.log(`[PROCESS] Mendownload gambar dari URL: ${imageUrl}`);
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(response.data);
        contentType = response.headers["content-type"] || "image/jpeg";
      } else {
        console.log("[PROCESS] Mengkonversi raw/base64 ke buffer...");
        buffer = Buffer.isBuffer(imageUrl) ? imageUrl : Buffer.from(imageUrl, "base64");
        contentType = "image/jpeg";
      }
      const {
        data: sign
      } = await this.axios.post("https://rest.alpha.fal.ai/storage/upload/initiate", {
        content_type: contentType,
        file_name: `upload-${uuidv4()}.jpg`
      }, {
        headers: {
          Authorization: `Key ${key}`
        }
      });
      console.log("[PROCESS] Mengunggah data biner ke storage...");
      await axios.put(sign.upload_url, buffer, {
        headers: {
          "Content-Type": contentType
        }
      });
      console.log("[SUCCESS] Gambar berhasil diunggah.");
      return sign.file_url;
    } catch (e) {
      console.error("[ERROR] Gagal di _uploadToFal:", e.message);
      throw e;
    }
  }
  async _pollResult(modelPath, requestId, key) {
    console.log(`[PROCESS] Memulai polling request: ${requestId}`);
    const statusUrl = `https://queue.fal.run/${modelPath}/requests/${requestId}`;
    const headers = {
      Authorization: `Key ${key}`
    };
    const startTime = Date.now();
    const timeout = 3e5;
    while (Date.now() - startTime < timeout) {
      const {
        data: statusRes
      } = await this.axios.get(`${statusUrl}/status`, {
        headers: headers
      });
      console.log(`[LOG] Status request [${requestId}]: ${statusRes.status}`);
      if (statusRes.status === "COMPLETED") {
        const {
          data: result
        } = await this.axios.get(statusUrl, {
          headers: headers
        });
        console.log("[SUCCESS] Proses API Fal selesai.");
        return result;
      }
      if (statusRes.status === "ERROR" || statusRes.status === "CANCELLED") {
        throw new Error(`Fal.ai Error: ${statusRes.status} - ${JSON.stringify(statusRes.logs)}`);
      }
      await new Promise(resolve => setTimeout(resolve, 5e3));
    }
    throw new Error("Polling Timeout: Proses terlalu lama.");
  }
  async listModels(params) {
    return this._executeWithRotation(async key => {
      const {
        data
      } = await this.axios.get(`https://api.fal.ai/v1/models?limit=${params.limit || 10}`, {
        headers: {
          Authorization: `Key ${key}`
        }
      });
      return data;
    });
  }
  async txt2img(params) {
    return this._executeWithRotation(async key => {
      const model = params.model || "fal-ai/flux/schnell";
      const {
        data: queue
      } = await this.axios.post(`https://queue.fal.run/${model}`, {
        prompt: params.prompt,
        image_size: params.image_size || "landscape_4_3",
        seed: params.seed || Math.floor(Math.random() * 1e6)
      }, {
        headers: {
          Authorization: `Key ${key}`
        }
      });
      if (params.async === "true" || params.async === true) return queue;
      return await this._pollResult(model, queue.request_id, key);
    });
  }
  async img2img(params) {
    return this._executeWithRotation(async key => {
      const model = params.model || "fal-ai/flux/dev/image-to-image";
      const uploadedUrl = await this._uploadToFal(params.imageUrl, key);
      const {
        data: queue
      } = await this.axios.post(`https://queue.fal.run/${model}`, {
        prompt: params.prompt || "",
        image_url: uploadedUrl,
        strength: params.strength || .85
      }, {
        headers: {
          Authorization: `Key ${key}`
        }
      });
      if (params.async === "true" || params.async === true) return queue;
      return await this._pollResult(model, queue.request_id, key);
    });
  }
  async img2vid(params) {
    return this._executeWithRotation(async key => {
      const model = params.model || "fal-ai/wan-pro/image-to-video";
      const uploadedUrl = await this._uploadToFal(params.imageUrl, key);
      const {
        data: queue
      } = await this.axios.post(`https://queue.fal.run/${model}`, {
        prompt: params.prompt || "Cinematic movement, 4k",
        image_url: uploadedUrl
      }, {
        headers: {
          Authorization: `Key ${key}`
        }
      });
      if (params.async === "true" || params.async === true) return queue;
      return await this._pollResult(model, queue.request_id, key);
    });
  }
  async checkStatus(params) {
    return this._executeWithRotation(async key => {
      const {
        model,
        request_id
      } = params;
      const headers = {
        Authorization: `Key ${key}`
      };
      const {
        data: status
      } = await this.axios.get(`https://queue.fal.run/${model}/requests/${request_id}/status`, {
        headers: headers
      });
      let result = null;
      if (status.status === "COMPLETED") {
        const {
          data
        } = await this.axios.get(`https://queue.fal.run/${model}/requests/${request_id}`, {
          headers: headers
        });
        result = data;
      }
      return {
        status: status.status,
        result: result
      };
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi",
      actions: ["models", "txt2img", "img2img", "img2vid", "status"]
    });
  }
  const api = new FalApi();
  try {
    let result;
    switch (action) {
      case "models":
        result = await api.listModels(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk txt2img"
          });
        }
        result = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'imageUrl' wajib diisi untuk img2img"
          });
        }
        result = await api.img2img(params);
        break;
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'imageUrl' wajib diisi untuk img2vid"
          });
        }
        result = await api.img2vid(params);
        break;
      case "status":
        if (!params.model || !params.request_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'model' dan 'request_id' wajib diisi"
          });
        }
        result = await api.checkStatus(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}`,
          valid_actions: ["models", "txt2img", "img2img", "img2vid", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e.response?.data?.detail || e.message || "Terjadi kesalahan internal pada server"
    });
  }
}