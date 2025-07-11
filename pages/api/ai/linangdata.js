import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class LinangData {
  constructor(params = {}) {
    this.cookieJar = new Map();
    this.client = axios.create({
      headers: {
        Accept: "text/plain, */*; q=0.01",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: "https://linangdata.com",
        Priority: "u=1, i",
        Referer: "https://linangdata.com/text-to-image-ai/",
        "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        ...params.headers
      },
      baseURL: params.baseURL || "https://linangdata.com"
    });
    this.client.interceptors.request.use(config => {
      if (this.cookieJar.size > 0) {
        const cookieString = Array.from(this.cookieJar.values()).join("; ");
        config.headers.Cookie = cookieString;
      }
      return config;
    }, error => {
      console.error("[REQUEST INTERCEPTOR ERROR]", error);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookieString => {
          const [nameValuePair] = cookieString.split(";")[0].split("=");
          const name = nameValuePair.trim();
          const value = cookieString.split(";")[0].substring(name.length + 1).trim();
          if (name) {
            this.cookieJar.set(name, `${name}=${value}`);
          }
        });
      }
      return response;
    }, error => {
      console.error("[RESPONSE INTERCEPTOR ERROR]", error.message);
      if (error.response && error.response.headers && error.response.headers["set-cookie"]) {
        const setCookieHeader = error.response.headers["set-cookie"];
        setCookieHeader.forEach(cookieString => {
          const [nameValuePair] = cookieString.split(";")[0].split("=");
          const name = nameValuePair.trim();
          const value = cookieString.split(";")[0].substring(name.length + 1).trim();
          if (name) {
            this.cookieJar.set(name, `${name}=${value}`);
          }
        });
      }
      return Promise.reject(error);
    });
  }
  async setFormData(formData = {}) {
    const form = new FormData();
    for (const key in formData) {
      if (Object.prototype.hasOwnProperty.call(formData, key)) {
        const value = formData[key];
        if (value instanceof Blob) {
          form.append(key, value, "filename");
        } else if (Buffer.isBuffer(value)) {
          form.append(key, new Blob([value]), "filename");
        } else {
          form.append(key, value);
        }
      }
    }
    return form;
  }
  async getImage(imageUrl) {
    console.log(`[getImage] Mengambil gambar dari: ${imageUrl}`);
    try {
      const response = await this.client.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"];
      const mimeType = contentType.split(";")[0];
      const ext = mimeType.split("/")[1];
      const blob = new Blob([buffer], {
        type: mimeType
      });
      console.log(`[getImage] Berhasil mengambil gambar. Tipe: ${mimeType}, Ext: ${ext}, Ukuran Blob: ${blob.size} bytes`);
      return {
        ext: ext,
        blob: blob
      };
    } catch (error) {
      console.error(`[getImage] Error mengambil metadata gambar dan blob dari ${imageUrl}:`, error.message);
      if (error.response) {
        console.error(`[getImage] Status respons: ${error.response.status}, data: ${error.response.data ? error.response.data.toString() : "Tidak ada data respons"}`);
      }
      return null;
    }
  }
  async generateImage(params = {}) {
    console.log(`[generateImage] Membuat gambar dengan prompt: "${params.prompt || "men in forest"}"`);
    const form = await this.setFormData({
      prompt: params.prompt || "men in forest",
      negativePrompt: params.negativePrompt || "no blur",
      preset: params.preset || "anime",
      orientation: params.orientation || "portrait",
      seed: params.seed || "",
      ...params.formData
    });
    try {
      const response = await this.client.post("text-to-image-ai/stablefusion-v2.php", form, {
        headers: form.headers,
        responseType: "arraybuffer"
      });
      console.log("[generateImage] Gambar berhasil dibuat.");
      return Buffer.from(response.data);
    } catch (error) {
      console.error("[generateImage] Error membuat gambar:", error.message);
      if (error.response) {
        console.error(`[generateImage] Status respons: ${error.response.status}, data: ${error.response.data ? error.response.data.toString() : "Tidak ada data respons"}`);
      }
      return null;
    }
  }
  async sendMessageToGPT(params = {}) {
    console.log(`[sendMessageToGPT] Mengirim pesan: "${params.prompt || "yolo"}" dengan model: "${params.model || "llama3.2:latest"}"`);
    const messages = params.messages || JSON.stringify([{
      role: "system",
      content: "Anda adalah asisten yang membantu."
    }, {
      role: "user",
      content: params.prompt || "yolo"
    }]);
    const form = await this.setFormData({
      question: params.prompt || "yolo",
      messages: messages,
      model: params.model || "llama3.2:latest",
      ...params.formData
    });
    try {
      const response = await this.client.post("chat-gpt/completions-llama3-stream.php", form, {
        headers: form.headers
      });
      const result = response.data.split("\n").filter(v => v.startsWith("{")).map(v => {
        try {
          const parsed = JSON.parse(v);
          return parsed?.message?.content || "";
        } catch (e) {
          console.warn("[sendMessageToGPT] Gagal parse JSON stream:", e.message, "dengan data:", v);
          return "";
        }
      }).join("") || null;
      console.log("[sendMessageToGPT] Pesan terkirim dan respons diterima.");
      return result;
    } catch (error) {
      console.error("[sendMessageToGPT] Error mengirim pesan ke GPT:", error.message);
      if (error.response) {
        console.error(`[sendMessageToGPT] Status respons: ${error.response.status}, data: ${error.response.data ? error.response.data.toString() : "Tidak ada data respons"}`);
      }
      return null;
    }
  }
  async restorePhoto(params = {}) {
    console.log(`[restorePhoto] Memulihkan foto dari URL: ${params.imageUrl}`);
    const imageInfo = await this.getImage(params.imageUrl);
    if (!imageInfo) {
      console.error("[restorePhoto] Gagal mendapatkan gambar untuk restorasi.");
      return null;
    }
    const {
      ext,
      blob
    } = imageInfo;
    const form = await this.setFormData({
      image: blob,
      upsample: params.upsample || "true",
      ...params.formData
    });
    try {
      const timestamp = new Date().getTime();
      const url = `photo-restoration/restorePhoto.php?uuid=${timestamp}&name=${timestamp}.${ext}`;
      console.log(`[restorePhoto] Posting ke: ${url}`);
      const response = await this.client.post(url, form, {
        headers: form.headers,
        responseType: "arraybuffer"
      });
      console.log("[restorePhoto] Foto berhasil dipulihkan.");
      return Buffer.from(response.data);
    } catch (error) {
      console.error("[restorePhoto] Error memulihkan foto:", error.message);
      if (error.response) {
        console.error(`[restorePhoto] Status respons: ${error.response.status}, data: ${error.response.data ? error.response.data.toString() : "Tidak ada data respons"}`);
      }
      return null;
    }
  }
  async removeBackground(params = {}) {
    console.log(`[removeBackground] Menghapus background dari URL gambar: ${params.imageUrl}`);
    const imageInfo = await this.getImage(params.imageUrl);
    if (!imageInfo) {
      console.error("[removeBackground] Gagal mendapatkan gambar untuk penghapusan background.");
      return null;
    }
    const {
      blob
    } = imageInfo;
    const form = await this.setFormData({
      image: blob,
      ...params.formData
    });
    try {
      const response = await this.client.post("background-remover/removePhotoBackground.php", form, {
        headers: form.headers,
        responseType: "json"
      });
      console.log("[removeBackground] Background berhasil dihapus.");
      return Buffer.from(response.data.image, "base64");
    } catch (error) {
      console.error("[removeBackground] Error menghapus background:", error.message);
      if (error.response) {
        console.error(`[removeBackground] Status respons: ${error.response.status}, data: ${error.response.data ? error.response.data.toString() : "Tidak ada data respons"}`);
      }
      return null;
    }
  }
  async reviveColor(params = {}) {
    console.log(`[reviveColor] Menghidupkan warna untuk URL gambar: ${params.imageUrl}`);
    const imageInfo = await this.getImage(params.imageUrl);
    if (!imageInfo) {
      console.error("[reviveColor] Gagal mendapatkan gambar untuk menghidupkan warna.");
      return null;
    }
    const {
      blob
    } = imageInfo;
    const form = await this.setFormData({
      image: blob,
      ...params.formData
    });
    try {
      const response = await this.client.post("ColorReviveAI/deoldify.php", form, {
        headers: form.headers,
        responseType: "json"
      });
      console.log("[reviveColor] Warna berhasil dihidupkan.");
      return Buffer.from(response.data.image, "base64");
    } catch (error) {
      console.error("[reviveColor] Error menghidupkan warna:", error.message);
      if (error.response) {
        console.error(`[reviveColor] Status respons: ${error.response.status}, data: ${error.response.data ? error.response.data.toString() : "Tidak ada data respons"}`);
      }
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  const linangData = new LinangData();
  let imageBuffer;
  try {
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt diperlukan."
          });
        }
        imageBuffer = await linangData.generateImage(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Gagal membuat gambar."
          });
        }
        break;
      case "chatgpt":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt diperlukan."
          });
        }
        const gptResponse = await linangData.sendMessageToGPT(params);
        if (gptResponse) {
          return res.status(200).json({
            result: gptResponse
          });
        } else {
          res.status(500).json({
            error: "Gagal memproses permintaan GPT."
          });
        }
        break;
      case "restore":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "URL gambar diperlukan."
          });
        }
        imageBuffer = await linangData.restorePhoto(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Gagal memulihkan gambar."
          });
        }
        break;
      case "remove":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "URL gambar diperlukan."
          });
        }
        imageBuffer = await linangData.removeBackground(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Gagal menghapus background gambar."
          });
        }
        break;
      case "revive":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "URL gambar diperlukan."
          });
        }
        imageBuffer = await linangData.reviveColor(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Gagal menghidupkan warna gambar."
          });
        }
        break;
      default:
        res.status(400).json({
          error: "Aksi tidak dikenal."
        });
        break;
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: error.message || "Kesalahan server internal."
    });
  }
}