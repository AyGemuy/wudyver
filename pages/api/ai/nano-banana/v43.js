import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      baseURL: "https://nanobanana.org",
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID",
        origin: "https://nanobanana.org",
        referer: "https://nanobanana.org/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v22`;
  }
  log(msg) {
    console.log(`[NanoBanana] ${msg}`);
  }
  async raw(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("data:")) {
          return Buffer.from(source.split(",")[1], "base64");
        } else if (source.startsWith("http")) {
          this.log("Downloading image from URL...");
          const res = await axios.get(source, {
            responseType: "arraybuffer"
          });
          return res.data;
        }
      }
      throw new Error("Format gambar tidak valid (Gunakan Buffer, URL, atau Base64).");
    } catch (e) {
      throw new Error(`Gagal memproses gambar: ${e.message}`);
    }
  }
  async createMail() {
    try {
      this.log("Creating temporary email...");
      const {
        data
      } = await axios.get(`${this.mailApi}?action=create`);
      if (!data?.email) throw new Error("Gagal generate email.");
      return {
        email: data.email,
        id: data.id
      };
    } catch (e) {
      throw e;
    }
  }
  async waitForOtp(mailId) {
    this.log(`Waiting for OTP (Mail ID: ${mailId})...`);
    let attempts = 0;
    while (attempts < 60) {
      try {
        const {
          data
        } = await axios.get(`${this.mailApi}?action=inbox&id=${mailId}`);
        if (data?.messages?.length > 0) {
          const subject = data.messages[0].subject || "";
          const match = subject.match(/(\d{6})/);
          if (match) return match[1];
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 3e3));
      attempts++;
    }
    throw new Error("OTP Timeout (Tidak ada pesan masuk).");
  }
  async uploadImage(buffer) {
    try {
      this.log(`Uploading image (${buffer.length} bytes)...`);
      const filename = `${Date.now()}.jpg`;
      const form = new FormData();
      form.append("file", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      const url = `/api/upload?filename=${filename}&contentType=image%2Fjpeg&fileSize=${buffer.length}`;
      const {
        data
      } = await this.api.post(url, form, {
        headers: form.getHeaders()
      });
      const resultUrl = data?.url || (typeof data === "string" ? data : null);
      if (!resultUrl) throw new Error("Gagal mendapatkan URL upload.");
      this.log(`Upload success: ${resultUrl}`);
      return resultUrl;
    } catch (e) {
      throw new Error(`Upload gagal: ${e.message}`);
    }
  }
  async login() {
    try {
      this.log("Memulai proses Login...");
      const csrfRes = await this.api.get("/api/auth/csrf");
      const csrfToken = csrfRes.data?.csrfToken;
      if (!csrfToken) throw new Error("CSRF Token tidak ditemukan.");
      const mail = await this.createMail();
      this.log(`Sending code to: ${mail.email}`);
      await this.api.post("/api/auth/send-code", {
        email: mail.email
      });
      const code = await this.waitForOtp(mail.id);
      this.log(`OTP Received: ${code}`);
      const params = new URLSearchParams();
      params.append("email", mail.email);
      params.append("code", code);
      params.append("redirect", "false");
      params.append("csrfToken", csrfToken);
      params.append("callbackUrl", "https://nanobanana.org/#nano-banana");
      await this.api.post("/api/auth/callback/email-code?", params.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const userRes = await this.api.post("/api/get-user-info");
      if (!userRes.data?.data?.email) throw new Error("Login verification failed.");
      this.log(`Login berhasil sebagai: ${userRes.data.data.email}`);
      return true;
    } catch (e) {
      this.log(`Login Error: ${e.message}`);
      throw e;
    }
  }
  async pollTask(taskId) {
    this.log(`Polling status task: ${taskId}`);
    while (true) {
      try {
        const {
          data
        } = await this.api.get(`/api/nano-banana/status/${taskId}`);
        if (data?.status === "completed") {
          return data;
        } else if (data?.status === "failed") {
          throw new Error("Status Task: Failed");
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        throw e;
      }
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      const cookies = await this.jar.getCookies("https://nanobanana.org");
      const hasSession = cookies.some(c => c.key.includes("session-token"));
      if (!hasSession) {
        await this.login();
      }
      const isI2I = !!imageUrl;
      let uploadedUrls = [];
      if (isI2I) {
        this.log("Mode detected: Image-to-Image (I2I)");
        const inputs = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const img of inputs) {
          if (!img) continue;
          const buf = await this.raw(img);
          const url = await this.uploadImage(buf);
          uploadedUrls.push(url);
        }
      } else {
        this.log("Mode detected: Text-to-Image (T2I)");
      }
      const payload = {
        type: isI2I ? "image-to-image" : "text-to-image",
        prompt: prompt || "best quality, masterpiece",
        num_images: 1,
        image_size: "auto",
        output_format: "png",
        ...rest
      };
      if (isI2I) {
        payload.image_urls = uploadedUrls;
      }
      this.log("Submitting generation task...");
      const {
        data: submitRes
      } = await this.api.post("/api/nano-banana/kie/submit", payload);
      if (!submitRes?.success || !submitRes?.task_id) {
        throw new Error(submitRes?.message || "Gagal submit task ke server.");
      }
      const taskId = submitRes.task_id;
      this.log(`Task submitted. ID: ${taskId} (Credits used: ${submitRes.credits_used})`);
      const finalRes = await this.pollTask(taskId);
      this.log("Generation Completed!");
      return {
        status: true,
        result: finalRes.result?.images?.map(img => img.url) || [],
        info: {
          type: payload.type,
          credits_remaining: finalRes.remaining_credits,
          meta: finalRes.result?._kieData
        }
      };
    } catch (e) {
      this.log(`FATAL ERROR: ${e.message}`);
      return {
        status: false,
        msg: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}