import axios from "axios";
import crypto from "crypto";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class NanoBananaAI {
  constructor(config = {}) {
    this.baseURL = config.baseURL || "https://nanobanana.ai";
    this.csrfToken = null;
    this.cookies = null;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: this.baseURL,
        referer: `${this.baseURL}/generator`,
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
    console.log("[NanoBananaAI] Class diinisialisasi.");
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
      const filename = imageUrl.split("/").pop()?.split("?")[0] || "image.jpg";
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"] || "image/jpeg";
      const fileSize = buffer.length;
      console.log(`[NanoBananaAI] Gambar berhasil diunduh (${filename}, ${fileSize} bytes).`);
      return {
        buffer: buffer,
        filename: filename,
        contentType: contentType,
        fileSize: fileSize
      };
    } catch (error) {
      console.error(`[NanoBananaAI] Gagal mengunduh gambar: ${error.message}`);
      throw new Error("Gagal mendapatkan data gambar dari URL.");
    }
  }
  async _ensureAuth() {
    if (this.csrfToken) {
      console.log("[NanoBananaAI] Sesi (CSRF Token & Cookie) sudah ada.");
      return;
    }
    try {
      console.log("[NanoBananaAI] Sesi tidak ditemukan, mengambil CSRF token baru...");
      const response = await this.api.get("/api/auth/csrf", {
        headers: {
          "content-type": "application/json"
        }
      });
      this.csrfToken = response.data?.csrfToken;
      const receivedCookies = response.headers["set-cookie"];
      if (!this.csrfToken || !receivedCookies) {
        throw new Error("Respons CSRF dari server tidak valid.");
      }
      this.cookies = receivedCookies.join("; ");
      this.api.defaults.headers.common["cookie"] = this.cookies;
      console.log(`[NanoBananaAI] Sesi berhasil dibuat.`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`[NanoBananaAI] Gagal mendapatkan CSRF Token: ${errorMessage}`);
      throw new Error(`Otentikasi awal gagal: ${errorMessage}`);
    }
  }
  async txt2img({
    prompt,
    styleId = "realistic"
  }) {
    console.log(`[NanoBananaAI] Memulai proses Text-to-Image dengan prompt: "${prompt}"`);
    try {
      await this._ensureAuth();
      const payload = {
        prompt: prompt,
        styleId: styleId,
        mode: "text"
      };
      console.log("[NanoBananaAI] Mengirim request Txt2Img...");
      const response = await this.api.post("/api/generate-image", payload, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log(`[NanoBananaAI] Request Txt2Img berhasil, task ID diterima: ${response.data?.taskId}`);
      console.log(response.data);
      const encryptedData = {
        taskId: response?.data?.taskId,
        token: this.csrfToken,
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
    styleId = "realistic"
  }) {
    console.log(`[NanoBananaAI] Memulai proses Image-to-Image dengan prompt: "${prompt}"`);
    try {
      await this._ensureAuth();
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      const publicUrls = [];
      console.log(`[NanoBananaAI] Ditemukan ${imageUrls.length} gambar untuk diproses.`);
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const imageIndex = i + 1;
        console.log(`\n[NanoBananaAI] Memproses gambar ${imageIndex}/${imageUrls.length}...`);
        const imageData = await this._getImageData(url);
        console.log(`[NanoBananaAI] Step 1/3 (Gambar ${imageIndex}): Meminta URL untuk upload...`);
        const urlResponse = await this.api.post("/api/get-upload-url", {
          fileName: imageData.filename,
          contentType: imageData.contentType,
          fileSize: imageData.fileSize
        }, {
          headers: {
            "content-type": "application/json"
          }
        });
        const {
          uploadUrl,
          publicUrl
        } = urlResponse.data;
        if (!uploadUrl || !publicUrl) {
          throw new Error(`Gagal mendapatkan URL upload untuk gambar ${imageIndex}.`);
        }
        console.log(`[NanoBananaAI] URL upload untuk gambar ${imageIndex} berhasil didapatkan.`);
        console.log(`[NanoBananaAI] Step 2/3 (Gambar ${imageIndex}): Mengupload file gambar...`);
        await axios.put(uploadUrl, imageData.buffer, {
          headers: {
            "Content-Type": imageData.contentType,
            "Content-Length": imageData.fileSize
          }
        });
        console.log(`[NanoBananaAI] File gambar ${imageIndex} berhasil diupload.`);
        publicUrls.push(publicUrl);
      }
      console.log("\n[NanoBananaAI] Step 3/3: Memulai proses generasi gambar...");
      const generatePayload = {
        prompt: prompt,
        styleId: styleId,
        mode: "image",
        imageUrl: publicUrls[0],
        imageUrls: publicUrls
      };
      const response = await this.api.post("/api/generate-image", generatePayload, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log(`[NanoBananaAI] Request Img2Img berhasil, task ID diterima: ${response.data?.taskId}`);
      console.log(response.data);
      const encryptedData = {
        taskId: response?.data?.taskId,
        token: this.csrfToken,
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
      cookie,
      type
    } = decryptedData;
    if (!token || !taskId) {
      throw new Error("Membutuhkan taskId dan token untuk memeriksa status.");
    }
    this.csrfToken = token;
    this.api.defaults.headers.common["cookie"] = cookie;
    console.log(`[NanoBananaAI] Memeriksa status untuk task: ${taskId}`);
    if (!taskId) {
      throw new Error("Task ID wajib diisi untuk memeriksa status.");
    }
    try {
      await this._ensureAuth();
      const endpoint = `/api/generate-image/status?taskId=${taskId}`;
      console.log(`[NanoBananaAI] Mengirim request status ke: ${endpoint}`);
      const response = await this.api.get(endpoint);
      console.log(`[NanoBananaAI] Status diterima: ${response.data?.status || "Selesai"}`);
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