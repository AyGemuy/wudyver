import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class SeeDream {
  constructor() {
    console.log("Proses: Menginisialisasi SeeDream Client...");
    this.jar = new CookieJar();
    this.axios = wrapper(axios.create({
      jar: this.jar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID",
        Accept: "*/*",
        Origin: "https://seedream-4.ai",
        Referer: "https://seedream-4.ai/ai-image/flux-kontext",
        ...SpoofHead()
      }
    }));
    this.session = {
      csrfToken: null,
      email: null,
      isLoggedIn: false
    };
    this.baseUrl = "https://seedream-4.ai";
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
  async _login() {
    if (this.session.isLoggedIn) {
      console.log("Proses: Sesi sudah aktif.");
      return;
    }
    console.log("Proses: Memulai proses login...");
    try {
      console.log("Proses: Membuat email sementara...");
      const mailResponse = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.session.email = mailResponse.data?.email;
      if (!this.session.email) throw new Error("Gagal membuat email sementara.");
      console.log(`Proses: Email dibuat -> ${this.session.email}`);
      console.log("Proses: Mendapatkan CSRF token...");
      const csrfResponse = await this.axios.get(`${this.baseUrl}/api/auth/csrf`);
      this.session.csrfToken = csrfResponse.data?.csrfToken;
      if (!this.session.csrfToken) throw new Error("Gagal mendapatkan CSRF token.");
      console.log("Proses: CSRF token diterima.");
      console.log("Proses: Meminta kode verifikasi...");
      await this.axios.post(`${this.baseUrl}/api/auth/email-verification`, {
        email: this.session.email
      });
      console.log("Proses: Menunggu dan memeriksa OTP...");
      const otpCode = await this._pollOtp(this.session.email);
      console.log(`Proses: OTP diterima -> ${otpCode}`);
      console.log("Proses: Memverifikasi OTP...");
      const callbackParams = new URLSearchParams({
        email: this.session.email,
        code: otpCode,
        redirect: "false",
        csrfToken: this.session.csrfToken,
        callbackUrl: `${this.baseUrl}/ai-image/flux-kontext`
      });
      await this.axios.post(`${this.baseUrl}/api/auth/callback/email-verification`, callbackParams.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const sessionResponse = await this.axios.get(`${this.baseUrl}/api/auth/session`);
      if (sessionResponse.data?.user) {
        this.session.isLoggedIn = true;
        console.log("Proses: Login berhasil, sesi aktif.");
      } else {
        throw new Error("Verifikasi sesi gagal setelah login.");
      }
    } catch (error) {
      console.error("Error selama proses login:", error.message);
      throw error;
    }
  }
  async _pollOtp(email, maxRetries = 60, interval = 3e3) {
    for (let i = 0; i < maxRetries; i++) {
      console.log(`Proses: Percobaan cek OTP ke-${i + 1}/${maxRetries}...`);
      try {
        const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const textContent = response.data?.data?.[0]?.text_content;
        if (textContent) {
          const otpMatch = textContent.match(/Your verification code is: (\d{6})/);
          if (otpMatch?.[1]) {
            return otpMatch[1];
          }
        }
      } catch (error) {
        console.warn("Proses: Gagal mengambil pesan OTP, mencoba lagi...");
      }
      await sleep(interval);
    }
    throw new Error("Gagal mendapatkan kode OTP setelah beberapa percobaan.");
  }
  async _upload(imageUrl) {
    console.log("Proses: Mengunggah gambar...");
    try {
      let imageBuffer;
      const filename = `image-${Date.now()}.jpg`;
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
      } else if (typeof imageUrl === "string") {
        imageBuffer = Buffer.from(imageUrl, "base64");
      } else if (imageUrl instanceof Buffer) {
        imageBuffer = imageUrl;
      } else {
        throw new Error("Format imageUrl tidak didukung (gunakan URL, base64, atau Buffer).");
      }
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      const response = await this.axios.post(`${this.baseUrl}/api/upload`, form, {
        headers: form.getHeaders()
      });
      const uploadedUrl = response.data?.url;
      if (!uploadedUrl) throw new Error("Gagal mendapatkan URL gambar setelah upload.");
      console.log(`Proses: Gambar berhasil diunggah -> ${uploadedUrl}`);
      return uploadedUrl;
    } catch (error) {
      console.error("Error saat mengunggah gambar:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      await this._login();
      const taskType = imageUrl ? "Image-to-Image" : "Text-to-Image";
      console.log(`Proses: Memulai task ${taskType}...`);
      let finalImageUrl = null;
      if (imageUrl) {
        finalImageUrl = await this._upload(imageUrl);
      }
      const payload = {
        prompt: prompt,
        model: rest.model || "flux-kontext-max",
        image_url: finalImageUrl,
        width: rest.width || 1024,
        height: rest.height || 1024,
        steps: rest.steps || 20,
        guidance_scale: rest.guidance_scale ?? 7.5,
        is_public: rest.is_public || false
      };
      console.log("Proses: Mengirim permintaan generasi gambar...");
      const createResponse = await this.axios.post(`${this.baseUrl}/api/image-generation-kie/create`, payload);
      const taskId = createResponse.data?.task_id;
      if (!taskId) throw new Error("Gagal memulai tugas generasi, tidak ada Task ID diterima.");
      console.log(`Proses: Task berhasil dibuat dengan ID: ${taskId}`);
      const cookie = await this.jar.getCookieString(this.baseUrl);
      const encryptedData = {
        task_id: taskId,
        cookie: cookie
      };
      return await this.enc(encryptedData);
    } catch (error) {
      console.error(`Error pada fungsi generate: ${error.message}`);
      return {
        error: true,
        message: error.message
      };
    }
  }
  async status({
    task_id
  }) {
    const decryptedData = await this.dec(task_id);
    const {
      task_id: taskId,
      cookie
    } = decryptedData;
    if (!taskId || !cookie) {
      throw new Error("Task ID atau cookie yang didekripsi tidak valid.");
    }
    try {
      const response = await this.axios.post(`${this.baseUrl}/api/image-generation-kie/status`, {
        taskId: taskId
      }, {
        headers: {
          Cookie: cookie,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          Referer: this.baseUrl
        }
      });
      const generations = response.data?.generations || [];
      return {
        result: generations
      };
    } catch (error) {
      console.error("Error saat memeriksa status task:", error.message);
      return {
        error: true,
        message: error.message,
        result: []
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
      error: "Action is required."
    });
  }
  const api = new SeeDream();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for generate."
          });
        }
        response = await api.generate(params);
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
          error: `Invalid action: ${action}. Supported actions are 'generate', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}