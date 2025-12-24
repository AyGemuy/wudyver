import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class DreamGenerator {
  constructor() {
    this.baseURL = "https://seedream4.app";
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.setHeaders();
    this.setupLogging();
  }
  setHeaders() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      referer: `${this.baseURL}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      origin: this.baseURL,
      ...SpoofHead()
    };
  }
  setupLogging() {
    this.client.interceptors.request.use(request => {
      console.log(`[REQUEST LOG] ==> ${request.method.toUpperCase()} ${request.url}`);
      if (request.data) {
        console.log("[REQUEST LOG] Payload:", request.data);
      }
      return request;
    });
    this.client.interceptors.response.use(response => {
      console.log(`[RESPONSE LOG] <== ${response.config.method.toUpperCase()} ${response.config.url} | Status: ${response.status}`);
      if (response.data) {
        console.log("[RESPONSE LOG] Data:", response.data);
      }
      return response;
    }, error => {
      if (error.response) {
        console.error(`[ERROR RESPONSE LOG] <== ${error.config.method.toUpperCase()} ${error.config.url} | Status: ${error.response.status}`);
        if (error.response.data) {
          console.error("[ERROR RESPONSE LOG] Data:", error.response.data);
        }
      } else if (error.request) {
        console.error("[ERROR LOG] No response received for request:", error.request);
      } else {
        console.error("[ERROR LOG] Error setting up request:", error.message);
      }
      return Promise.reject(error);
    });
  }
  async upload(imgData, filename = `img-${Date.now()}.jpg`) {
    console.log("[PROCESS LOG] Memulai proses upload gambar...");
    try {
      const formData = new FormData();
      let buffer;
      let contentType = "image/jpeg";
      if (typeof imgData === "string") {
        if (imgData.startsWith("data:")) {
          const matches = imgData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches?.length !== 3) throw new Error("Format base64 tidak valid");
          buffer = Buffer.from(matches[2], "base64");
          contentType = matches[1] || contentType;
        } else {
          console.log("[PROCESS LOG] Mengunduh gambar dari URL...");
          const response = await this.client.get(imgData, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          buffer = Buffer.from(response.data);
          contentType = response.headers["content-type"] || contentType;
        }
      } else if (Buffer.isBuffer(imgData)) {
        buffer = imgData;
      } else {
        throw new Error("Tipe gambar tidak didukung");
      }
      formData.append("file", buffer, {
        filename: filename,
        contentType: contentType
      });
      formData.append("folder", "nano-banana/input-images");
      const response = await this.client.post(`${this.baseURL}/api/storage/upload`, formData, {
        headers: {
          ...this.headers,
          "content-type": `multipart/form-data; boundary=${formData.getBoundary()}`
        },
        timeout: 45e3
      });
      console.log("[SUCCESS LOG] Upload berhasil:", response.data.url);
      return response.data;
    } catch (error) {
      console.error("[ERROR LOG] Upload error:", error.message);
      if (error.response && error.response.status === 402) {
        throw new Error("Upload gagal: Pembayaran diperlukan (402). Mungkin kredit Anda habis atau ada masalah dengan pembayaran.");
      }
      throw new Error(`Upload gagal: ${error.message}`);
    }
  }
  async generate({
    prompt,
    imageUrl,
    numImages = 1,
    ...options
  }) {
    console.log("[PROCESS LOG] Memulai pembuatan task generasi...");
    try {
      const mode = imageUrl ? "image-editing" : "text-to-image";
      console.log(`[PROCESS LOG] Mode: ${mode}`);
      const imageUrls = imageUrl ? [await this.upload(imageUrl).then(res => res.url)] : [];
      const payload = {
        mode: mode,
        prompt: prompt,
        numImages: numImages,
        ...imageUrls.length && {
          imageUrls: imageUrls
        },
        ...options
      };
      const response = await this.client.post(`${this.baseURL}/api/ai/image/nano-banana/generate`, payload, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        timeout: 3e4
      });
      const taskId = response.data?.data?.taskId;
      if (!taskId) throw new Error("Tidak ada ID task yang diterima");
      console.log("[SUCCESS LOG] Task berhasil dibuat dengan ID:", taskId);
      return await this.wait(taskId);
    } catch (error) {
      console.error("[ERROR LOG] Creation error:", error.message);
      if (error.response && error.response.status === 402) {
        throw new Error("Generasi gagal: Pembayaran diperlukan (402). Cek status kredit atau langganan Anda.");
      }
      throw new Error(`Generasi gagal: ${error.message}`);
    }
  }
  async wait(taskId, maxAttempts = 60, interval = 3e3) {
    console.log(`[PROCESS LOG] Menunggu penyelesaian task: ${taskId}`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[PROCESS LOG] Cek status (${attempt}/${maxAttempts})...`);
        const response = await this.client.get(`${this.baseURL}/api/ai/image/nano-banana/status/${taskId}`, {
          headers: this.headers,
          timeout: 15e3
        });
        const status = response.data?.data?.status;
        const output = response.data?.data?.output;
        const errorMsg = response.data?.data?.error;
        if (status === 2) {
          console.log("[SUCCESS LOG] Task selesai dengan sukses");
          return this.parseOutput(output, response.data.data);
        }
        if (status === 3) {
          throw new Error(errorMsg || "Task gagal di sisi server");
        }
        if (attempt === maxAttempts) {
          throw new Error("Waktu tunggu task habis (timeout)");
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`[ERROR LOG] Percobaan polling ke-${attempt} gagal:`, error.message);
        if (error.response && error.response.status === 402) {
          throw new Error("Polling gagal: Pembayaran diperlukan (402). Tidak dapat memeriksa status task.");
        }
        if (attempt === maxAttempts) {
          throw new Error(`Polling gagal setelah ${maxAttempts} percobaan: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }
  parseOutput(output, details) {
    try {
      const parsed = output ? JSON.parse(output) : {};
      return {
        success: true,
        images: parsed.images || [],
        originalUrls: parsed.originalUrls || [],
        provider: parsed.provider,
        model: parsed.model,
        taskId: details.taskId,
        credits: details.creditsUsed,
        completedAt: details.completedAt,
        details: details
      };
    } catch (error) {
      console.warn("[WARNING LOG] Gagal mem-parsing output, mengembalikan data mentah");
      return {
        success: true,
        rawOutput: output,
        taskId: details.taskId,
        credits: details.creditsUsed,
        completedAt: details.completedAt,
        details: details
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new DreamGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}