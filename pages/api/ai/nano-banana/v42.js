import axios from "axios";
import FormData from "form-data";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  randomUUID,
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.baseURL = "https://nano-banana-pro.co";
    this.mailURL = `https://${apiConfig.DOMAIN_URL}/api/mails/v22`;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4
    }));
    this.headers = this.genDevice();
  }
  genDevice() {
    const chromeVer = Math.floor(Math.random() * (130 - 120 + 1)) + 120;
    const brands = [{
      brand: "Not)A;Brand",
      ver: "99"
    }, {
      brand: "Google Chrome",
      ver: chromeVer.toString()
    }, {
      brand: "Chromium",
      ver: chromeVer.toString()
    }];
    const secChUa = brands.map(b => `"${b.brand}";v="${b.ver}"`).join(", ");
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: this.baseURL,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseURL}/`,
      "sec-ch-ua": secChUa,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer}.0.0.0 Mobile Safari/537.36`
    };
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString("id-ID", {
      hour12: false
    });
    console.log(`[${time}] [${type}] ${msg}`);
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async req(url, method = "GET", data = null, customHeaders = {}) {
    try {
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...customHeaders
        },
        maxRedirects: 10
      };
      if (data) config.data = data;
      const res = await this.client(config);
      return res.data;
    } catch (e) {
      const status = e.response?.status || "Unknown";
      const errMsg = e.response?.data?.message || e.message;
      this.log(`Req Error (${status}): ${url} -> ${errMsg}`, "ERROR");
      throw e;
    }
  }
  async createMail() {
    this.log("Membuat email sementara...");
    try {
      const res = await axios.get(`${this.mailURL}?action=create`);
      const emailData = {
        id: res?.data?.id,
        email: res?.data?.email
      };
      this.log(`Email dibuat: ${emailData.email}`);
      return emailData;
    } catch (e) {
      throw new Error("Gagal membuat email temp");
    }
  }
  async getVerifyLink(mailId) {
    this.log("Menunggu email verifikasi masuk...");
    let attempts = 0;
    while (attempts < 60) {
      try {
        await this.sleep(3e3);
        const res = await axios.get(`${this.mailURL}?action=inbox&id=${mailId}`);
        const messages = res?.data?.messages || [];
        const targetMsg = messages.find(m => m.sender?.includes("nano-banana") || m.subject?.toLowerCase().includes("verify"));
        if (targetMsg) {
          this.log("Email verifikasi ditemukan, membaca isi...");
          const detail = await axios.get(`${this.mailURL}?action=message&region=${targetMsg.storage.region}&key=${targetMsg.storage.key}`);
          const link = detail?.data?.extracted_links?.[0]?.href;
          if (link) return link;
        }
      } catch (e) {}
      attempts++;
      process.stdout.write(".");
    }
    console.log("");
    throw new Error("Timeout: Email verifikasi tidak masuk");
  }
  async register(email) {
    this.log(`Mendaftarkan akun: ${email}`);
    await this.req(`${this.baseURL}/api/auth/sign-up/email`, "POST", {
      email: email,
      password: email,
      name: email
    });
  }
  async activateSession(link) {
    this.log("Mengklik link verifikasi...");
    await this.req(link, "GET", null, {
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "upgrade-insecure-requests": "1"
    });
    this.log("Menunggu sesi aktif...");
    let attempts = 0;
    while (attempts < 60) {
      try {
        const res = await this.req(`${this.baseURL}/api/auth/get-session`);
        if (res?.session?.token) {
          this.log("Session Token berhasil didapatkan!", "SUCCESS");
          return res.user;
        }
      } catch (e) {}
      await this.sleep(3e3);
      attempts++;
    }
    throw new Error("Gagal mengaktifkan session user");
  }
  async getUserInfo() {
    return await this.req(`${this.baseURL}/api/user/get-user-info`, "POST");
  }
  async getBuffer(source) {
    if (!source) return null;
    if (Buffer.isBuffer(source)) return source;
    if (typeof source === "string" && source.startsWith("data:")) {
      return Buffer.from(source.split(",")[1], "base64");
    }
    if (typeof source === "string" && source.startsWith("http")) {
      const res = await axios.get(source, {
        responseType: "arraybuffer"
      });
      return Buffer.from(res.data);
    }
    if (typeof source === "string" && source.length > 200) {
      try {
        return Buffer.from(source, "base64");
      } catch (e) {}
    }
    return null;
  }
  async uploadImage(source) {
    try {
      const buffer = await this.getBuffer(source);
      if (!buffer) return null;
      const form = new FormData();
      const filename = `${randomUUID()}.jpg`;
      form.append("files", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      this.log(`Mengupload gambar... (${buffer.length} bytes)`);
      const res = await this.req(`${this.baseURL}/api/storage/upload-image`, "POST", form, {
        ...form.getHeaders()
      });
      return res?.data?.results?.[0]?.url;
    } catch (e) {
      this.log("Gagal upload gambar", "WARN");
      return null;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    this.log("=== MEMULAI GENERATE ===", "START");
    const start = Date.now();
    try {
      let userInfo;
      try {
        userInfo = await this.getUserInfo();
        if (!userInfo?.data?.id) throw new Error("No Session");
        this.log("Menggunakan session yang ada.");
      } catch (e) {
        const mail = await this.createMail();
        await this.register(mail.email);
        const link = await this.getVerifyLink(mail.id);
        await this.activateSession(link);
        userInfo = await this.getUserInfo();
      }
      const credits = userInfo?.data?.credits?.remainingCredits ?? 0;
      this.log(`User Credits: ${credits}`);
      let scene = "text-to-image";
      let options = {};
      const inputImages = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
      if (inputImages.length > 0) {
        scene = "image-to-image";
        this.log(`Mode terdeteksi: Image-to-Image (${inputImages.length} inputs)`);
        const uploadedUrls = [];
        for (const img of inputImages) {
          const url = await this.uploadImage(img);
          if (url) uploadedUrls.push(url);
        }
        if (uploadedUrls.length === 0) throw new Error("Gagal mengupload semua gambar input");
        options = {
          image_input: uploadedUrls
        };
      } else {
        this.log("Mode terdeteksi: Text-to-Image");
      }
      const payload = {
        mediaType: "image",
        scene: scene,
        provider: rest.provider || "kie",
        model: rest.model || "nano-banana",
        prompt: prompt || "Best quality masterpiece",
        options: options
      };
      const taskRes = await this.req(`${this.baseURL}/api/ai/generate`, "POST", payload);
      const taskId = taskRes?.data?.id;
      if (!taskId) throw new Error(`Gagal membuat task. Response: ${JSON.stringify(taskRes)}`);
      this.log(`Task ID: ${taskId}`);
      let resultData = null;
      let attempts = 0;
      this.log("Menunggu hasil generate...");
      while (attempts < 60) {
        await this.sleep(3e3);
        attempts++;
        const queryRes = await this.req(`${this.baseURL}/api/ai/query`, "POST", {
          taskId: taskId
        });
        const status = queryRes?.data?.status;
        if (attempts % 2 === 0) process.stdout.write(`[${status}] `);
        if (status === "success") {
          console.log("");
          resultData = queryRes.data;
          break;
        } else if (status === "failed" || status === "error") {
          console.log("");
          throw new Error("Server mengembalikan status FAILED");
        }
      }
      if (!resultData) throw new Error("Timeout: Hasil tidak keluar dalam 2 menit");
      let images = [];
      try {
        const innerResult = JSON.parse(resultData.taskResult || "{}");
        const resultJson = JSON.parse(innerResult.resultJson || "{}");
        images = resultJson.resultUrls || [];
      } catch (parseError) {
        this.log("Error parsing JSON output", "WARN");
        const urls = resultData.taskResult?.match(/https?:\/\/[^"]+/g) || [];
        images = [...new Set(urls)];
      }
      const duration = ((Date.now() - start) / 1e3).toFixed(2);
      this.log(`Selesai dalam ${duration} detik.`, "SUCCESS");
      return {
        status: true,
        taskId: resultData.id,
        result: images,
        info: {
          model: resultData.model,
          prompt: resultData.prompt,
          cost: resultData.costCredits,
          createdAt: resultData.createdAt
        }
      };
    } catch (error) {
      this.log(error.message, "FATAL");
      return {
        status: false,
        error: error.message
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