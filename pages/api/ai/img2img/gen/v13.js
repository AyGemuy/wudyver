import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as cookieJarWrapper
} from "axios-cookiejar-support";
class ImageToImageTech {
  constructor() {
    const jar = new CookieJar();
    this.client = cookieJarWrapper(axios.create({
      jar: jar
    }));
    this.client.defaults.baseURL = "https://imagetoimage.tech";
    this.client.defaults.headers.common = {
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      origin: "https://imagetoimage.tech",
      referer: "https://imagetoimage.tech/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    console.log("Proses: Klien HTTP untuk ImageToImage.tech telah diinisialisasi.");
  }
  async _initializeSession() {
    console.log("Proses: Langkah 1 - Menginisialisasi sesi & mendapatkan CSRF token...");
    const response = await this.client.get("/api/auth/csrf");
    if (!response.data.csrfToken) {
      throw new Error("Gagal mendapatkan CSRF token pada saat inisialisasi sesi.");
    }
    console.log("Proses: Sesi berhasil diinisialisasi.");
  }
  _parseUploadUrlResponse(responseText) {
    const lines = responseText.split("\n");
    const jsonLine = lines.find(line => line.startsWith("1:"));
    if (!jsonLine) {
      throw new Error("Tidak dapat menemukan baris JSON yang valid dalam respons URL unggah.");
    }
    const jsonData = JSON.parse(jsonLine.substring(2));
    if (!jsonData.success || !jsonData.success.url || !jsonData.success.key) {
      throw new Error("Respons JSON dari URL unggah tidak memiliki format yang diharapkan.");
    }
    return jsonData.success;
  }
  async _getUploadUrl(contentType, contentLength) {
    console.log("Proses: Langkah 2 - Meminta URL unggah dari server...");
    const randomId = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    const payload = [contentType, contentLength, randomId];
    const response = await this.client.post("/", JSON.stringify(payload), {
      headers: {
        accept: "text/x-component",
        "content-type": "text/plain;charset=UTF-8",
        "next-action": "f5c9f94f5b370b337d1195b4e3e09f3fc73ce571"
      }
    });
    const {
      url,
      key
    } = this._parseUploadUrlResponse(response.data);
    console.log("Proses: URL unggah berhasil didapatkan.");
    return {
      uploadUrl: url,
      key: key
    };
  }
  async _uploadImage(uploadUrl, imageBuffer, contentType) {
    console.log("Proses: Langkah 3 - Mengunggah data gambar...");
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": imageBuffer.length
      }
    });
    console.log("Proses: Gambar berhasil diunggah.");
  }
  async _createTask(prompt, imageKey, options = {}) {
    console.log("Proses: Langkah 4 - Membuat tugas image-to-image...");
    const payload = {
      modelType: options.modelType || 11006,
      prompt: prompt || PROMPT.text,
      originImageUrlArray: [imageKey],
      aspectRatio: options.aspectRatio || "match_input_image",
      imageFormat: options.imageFormat || "png",
      displayPublic: options.displayPublic !== false
    };
    const response = await this.client.post("/api/image-ai/image-to-image/create", payload, {
      headers: {
        "content-type": "application/json"
      }
    });
    console.log("Proses: Tugas berhasil dibuat.");
    return response.data;
  }
  async generate({
    imageUrl,
    prompt,
    options = {}
  }) {
    await this._initializeSession();
    let imageBuffer;
    let contentType;
    if (Buffer.isBuffer(imageUrl)) {
      console.log("Proses: Menggunakan input Buffer gambar.");
      imageBuffer = imageUrl;
      contentType = options.contentType;
      if (!contentType) {
        throw new Error("Opsi 'contentType' wajib diisi jika input 'imageUrl' adalah Buffer.");
      }
    } else if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
      console.log("Proses: Menggunakan input base64 data URL.");
      const match = imageUrl.match(/^data:(.+);base64,(.*)$/);
      if (!match) {
        throw new Error("Format base64 data URL pada `imageUrl` tidak valid.");
      }
      contentType = match[1];
      imageBuffer = Buffer.from(match[2], "base64");
    } else if (typeof imageUrl === "string") {
      console.log(`Proses: Mengunduh gambar dari URL: ${imageUrl}`);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      imageBuffer = Buffer.from(imageResponse.data, "binary");
      contentType = imageResponse.headers["content-type"] || "image/jpeg";
    } else {
      throw new Error("Input 'imageUrl' tidak valid. Harap berikan URL, base64 data URL, atau Buffer.");
    }
    const {
      uploadUrl,
      key
    } = await this._getUploadUrl(contentType, imageBuffer.length);
    await this._uploadImage(uploadUrl, imageBuffer, contentType);
    const result = await this._createTask(prompt, key, options);
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Input 'imageUrl' wajib diisi."
    });
  }
  try {
    const api = new ImageToImageTech();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Terjadi kesalahan pada API:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}