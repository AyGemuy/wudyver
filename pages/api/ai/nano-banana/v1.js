import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class NanoBananaAI {
  constructor(config = {}) {
    this.baseURL = config.baseURL || "https://nanobananaai.org";
    this.csrfToken = null;
    this.cookies = null;
    this.fingerprintId = crypto.randomBytes(16).toString("hex");
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: this.baseURL,
        referer: `${this.baseURL}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...config.headers || {},
        ...SpoofHead()
      }
    });
    console.log(`[NanoBananaAI] Class diinisialisasi dengan Fingerprint ID: ${this.fingerprintId}`);
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
  async _getImageData(imageUrl) {
    console.log(`[NanoBananaAI] Mengunduh gambar dari: ${imageUrl}`);
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const filename = imageUrl.split("/").pop() || "image.jpg";
      const buffer = Buffer.from(response.data);
      console.log(`[NanoBananaAI] Gambar berhasil diunduh (${filename}, ${buffer.length} bytes).`);
      return {
        buffer: buffer,
        filename: filename
      };
    } catch (error) {
      console.error(`[NanoBananaAI] Gagal mengunduh gambar: ${error.message}`);
      throw new Error("Gagal mendapatkan data gambar dari URL.");
    }
  }
  async _ensureAuth() {
    if (this.csrfToken) {
      console.log("[NanoBananaAI] CSRF Token sudah ada, melanjutkan request.");
      return;
    }
    try {
      console.log("[NanoBananaAI] CSRF Token tidak ditemukan, mencoba mengambil...");
      const response = await this.api.get("/api/auth/csrf", {
        headers: {
          "content-type": "application/json"
        }
      });
      this.csrfToken = response.data?.csrfToken;
      const receivedCookies = response.headers["set-cookie"];
      if (!this.csrfToken || !receivedCookies) {
        throw new Error("Respons CSRF tidak valid.");
      }
      this.cookies = receivedCookies.join("; ");
      this.api.defaults.headers.common["cookie"] = this.cookies;
      console.log(`[NanoBananaAI] CSRF Token berhasil didapatkan: ${this.csrfToken.substring(0, 15)}...`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`[NanoBananaAI] Gagal mendapatkan CSRF Token: ${errorMessage}`);
      throw new Error(`Otentikasi awal gagal: ${errorMessage}`);
    }
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    console.log(`[NanoBananaAI] Memulai proses Text-to-Image dengan prompt: "${prompt}"`);
    try {
      await this._ensureAuth();
      const payload = {
        prompt: prompt,
        aspectRatio: rest?.aspectRatio || "1:1",
        imageCount: rest?.imageCount || 1,
        fingerprintId: this.fingerprintId
      };
      console.log("[NanoBananaAI] Mengirim request Txt2Img...");
      const response = await this.api.post("/api/gen-text-to-image", payload, {
        headers: {
          "content-type": "application/json",
          "x-fingerprint-id": this.fingerprintId
        }
      });
      console.log("[NanoBananaAI] Request Txt2Img berhasil, task ID diterima.");
      console.log(response.data);
      const encryptedData = {
        taskId: response?.data?.data?.taskId,
        token: this.csrfToken,
        id: this.fingerprintId,
        cookie: this.cookies,
        type: "txt2img"
      };
      return await this.enc(encryptedData);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`[NanoBananaAI] Gagal pada proses Txt2Img: ${errorMessage}`);
      throw error;
    }
  }
  async img2img({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log(`[NanoBananaAI] Memulai proses Image-to-Image dengan prompt: "${prompt}"`);
    try {
      await this._ensureAuth();
      const {
        buffer,
        filename
      } = await this._getImageData(imageUrl);
      const formData = new FormData();
      formData.append("image", buffer, filename);
      formData.append("prompt", prompt);
      formData.append("type", rest?.type || "Anime to Real");
      formData.append("aspectRatio", rest?.aspectRatio || "2:3");
      formData.append("fingerprintId", this.fingerprintId);
      formData.append("imageCount", rest?.imageCount || 1);
      console.log("[NanoBananaAI] Mengirim request Img2Img...");
      const response = await this.api.post("/api/gen-ghibli-image-4o", formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      console.log("[NanoBananaAI] Request Img2Img berhasil, task ID diterima.");
      console.log(response.data);
      const encryptedData = {
        taskId: response?.data?.data?.taskId,
        token: this.csrfToken,
        id: this.fingerprintId,
        cookie: this.cookies,
        type: "img2img"
      };
      return await this.enc(encryptedData);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`[NanoBananaAI] Gagal pada proses Img2Img: ${errorMessage}`);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    const decryptedData = await this.dec(task_id);
    const {
      taskId,
      token,
      id,
      cookie,
      type
    } = decryptedData;
    if (!token || !taskId) {
      throw new Error("Membutuhkan taskId dan token untuk memeriksa status.");
    }
    this.csrfToken = token;
    this.api.defaults.headers.common["cookie"] = cookie;
    console.log(`[NanoBananaAI] Memeriksa status untuk task [${type}]: ${taskId}`);
    if (!taskId) {
      throw new Error("Task ID wajib diisi untuk memeriksa status.");
    }
    try {
      await this._ensureAuth();
      const endpoint = type === "txt2img" ? "/api/gen-text-to-image" : "/api/gen-ghibli-image-4o";
      const params = new URLSearchParams({
        taskId: taskId,
        fingerprintId: id
      });
      console.log(`[NanoBananaAI] Mengirim request status ke: ${endpoint}?${params}`);
      const response = await this.api.get(`${endpoint}?${params}`);
      console.log(`[NanoBananaAI] Status diterima: ${response.data?.status || "Selesai"}`);
      console.log(response.data);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`[NanoBananaAI] Gagal memeriksa status: ${errorMessage}`);
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
  const api = new NanoBananaAI();
  try {
    let response;
    switch (action) {
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2img."
          });
        }
        response = await api.img2img(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2img(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2img', 'txt2img', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}