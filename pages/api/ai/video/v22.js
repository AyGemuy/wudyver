import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
const TEMP_MAIL_API = `https://${apiConfig.DOMAIN_URL}/api/mails/v13`;
const BASE_URL = "https://nanobanana.org";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class NanoBananaSora2 {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: BASE_URL,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${BASE_URL}/sora2`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ...SpoofHead()
      }
    }));
    this.isInitialized = false;
  }
  extractOTP(html) {
    if (!html) return null;
    const $ = cheerio.load(html);
    const fullText = $("body").text().trim();
    const otpMatch = fullText.match(/(\b\d{6}\b)/);
    return otpMatch ? otpMatch[1] : null;
  }
  async _logCookies(step) {
    console.log(`--- 🍪 LOG COOKIE PADA LANGKAH: ${step} ---`);
    const cookies = await this.cookieJar.getCookies(BASE_URL);
    if (cookies.length === 0) {
      console.log("Tidak ada cookie yang tersimpan.");
    } else {
      cookies.forEach(cookie => console.log(cookie.toString()));
    }
    console.log(`-------------------------------------------`);
  }
  async _authenticate() {
    if (this.isInitialized) return;
    try {
      console.log("⏳ Memulai proses autentikasi...");
      const csrfResponse = await this.client.get(`${BASE_URL}/api/auth/csrf`);
      const csrfToken = csrfResponse.data?.csrfToken;
      if (!csrfToken) throw new Error("Gagal mendapatkan token CSRF.");
      console.log("🔑 Token CSRF diterima.");
      const mailResponse = await this.client.get(`${TEMP_MAIL_API}?action=create`);
      const email = mailResponse.data?.data?.address;
      if (!email) throw new Error("Gagal membuat email.");
      console.log(`✉️  Email dibuat: ${email}`);
      await this.client.post(`${BASE_URL}/api/auth/send-code`, {
        email: email
      });
      console.log("✅ Kode verifikasi terkirim.");
      let otp = null;
      console.log("⏳ Memeriksa OTP (polling)...");
      for (let i = 0; i < 60; i++) {
        const otpResponse = await this.client.get(`${TEMP_MAIL_API}?action=message&email=${email}`);
        otp = this.extractOTP(otpResponse.data?.data?.rows?.[0]?.html);
        if (otp) {
          console.log(`\n✅ OTP ditemukan: ${otp}`);
          break;
        }
        process.stdout.write(`...`);
        await delay(3e3);
      }
      if (!otp) throw new Error("Gagal mendapatkan OTP.");
      const params = new URLSearchParams({
        email: email,
        code: otp,
        redirect: "false",
        csrfToken: csrfToken,
        callbackUrl: `${BASE_URL}/`
      });
      await this.client.post(`${BASE_URL}/api/auth/callback/email-code`, params, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-auth-return-redirect": "1"
        }
      });
      console.log("✅ Verifikasi OTP berhasil.");
      await this._logCookies("Setelah Verifikasi OTP");
      await this._checkSession();
      await this._triggerCreditAllocation();
      await this._waitForCredits();
      await this._userInfo();
      this.isInitialized = true;
      console.log("\n✅ Inisialisasi Sesi Berhasil.\n");
    } catch (error) {
      const errorMessage = error.response ? `${error.message} (Status: ${error.response.status})` : error.message;
      console.error(`\n❌ Gagal saat autentikasi: ${errorMessage}`);
      throw new Error(`Gagal menjalankan proses utama: ${errorMessage}`);
    }
  }
  async _checkSession() {
    console.log("⏳ Memeriksa sesi...");
    const res = await this.client.get(`${BASE_URL}/api/auth/session`);
    if (!res.data?.user) throw new Error("Sesi tidak aktif.");
    console.log("✅ Sesi aktif.");
  }
  async _triggerCreditAllocation() {
    console.log("⏳ Mengunjungi halaman Sora2 untuk alokasi kredit...");
    await this.client.get(`${BASE_URL}/sora2`, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        priority: "u=0, i",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1"
      }
    });
    console.log("✅ Kunjungan ke halaman Sora2 berhasil.");
    await this._logCookies("Setelah Kunjungan Halaman Sora2");
  }
  async _waitForCredits() {
    console.log("⏳ Menunggu alokasi kredit (polling)...");
    for (let i = 0; i < 60; i++) {
      const res = await this.client.post(`${BASE_URL}/api/get-user-credits`, {});
      const credits = res.data?.data?.left_credits;
      if (typeof credits !== "undefined" && credits > 0) {
        this.credits = credits;
        console.log(`\n💰 Kredit diterima: ${this.credits}`);
        return;
      }
      process.stdout.write(`...`);
      await delay(3e3);
    }
    throw new Error("Gagal mendapatkan kredit setelah waktu yang lama. Akun baru mungkin tidak lagi mendapatkan kredit gratis.");
  }
  async _userInfo() {
    console.log("⏳ Mengambil info profil pengguna...");
    const res = await this.client.post(`${BASE_URL}/api/get-user-info`, {});
    if (!res.data?.data?.id) throw new Error("Gagal mendapatkan info pengguna.");
    console.log(`👤 Login sebagai: ${res.data.data.email}`);
  }
  async _upload(imageUrl) {
    console.log("⏳ Mengunduh dan mengunggah gambar dari URL...");
    if (typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
      throw new Error("imageUrl harus berupa URL gambar yang valid (http/https)");
    }
    try {
      console.log(`📥 Mengunduh: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 3e4,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      const fileBuffer = Buffer.from(response.data);
      console.log(`📦 Ukuran buffer: ${(fileBuffer.length / 1024).toFixed(1)} KB`);
      const url = new URL(imageUrl);
      let filename = `image_${Date.now()}.jpg`;
      let contentType = "image/jpeg";
      if (url.pathname.endsWith(".png")) {
        filename = `image_${Date.now()}.png`;
        contentType = "image/png";
      } else if (url.pathname.endsWith(".webp")) {
        filename = `image_${Date.now()}.webp`;
        contentType = "image/webp";
      }
      console.log(`⬆️  Mengunggah sebagai: ${filename}`);
      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: filename,
        contentType: contentType
      });
      const uploadResponse = await this.client.post(`${BASE_URL}/api/upload`, form, {
        headers: {
          ...form.getHeaders(),
          "Content-Length": form.getLengthSync()
        },
        timeout: 6e4
      });
      if (!uploadResponse.data?.success || !uploadResponse.data.url) {
        throw new Error(`Upload gagal: ${JSON.stringify(uploadResponse.data)}`);
      }
      console.log("✅ Gambar berhasil diunggah:", uploadResponse.data.url);
      return uploadResponse.data.url;
    } catch (error) {
      console.error("❌ Error upload:", error.message);
      if (error.code === "ECONNABORTED") {
        throw new Error(`Timeout: ${error.message}`);
      } else if (error.response) {
        throw new Error(`Server error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Gagal upload gambar: ${error.message}`);
    }
  }
  async generate(params) {
    const {
      prompt,
      imageUrl,
      aspect_ratio = "portrait",
      remove_watermark = true,
      model = "sora2",
      type = "text-to-video"
    } = params;
    if (!prompt) throw new Error('Paramenter "prompt" diperlukan.');
    await this._authenticate();
    const isImageToVideo = imageUrl && (Array.isArray(imageUrl) ? imageUrl.length > 0 : imageUrl.trim() !== "");
    const finalType = isImageToVideo ? "image-to-video" : "text-to-video";
    console.log(`🚀 Memulai tugas Sora2: **${finalType.toUpperCase()}**`);
    console.log(`📝 Prompt: ${prompt}`);
    let uploadedUrls = [];
    if (isImageToVideo) {
      console.log(`🖼️  Mengunggah ${Array.isArray(imageUrl) ? imageUrl.length : 1} gambar...`);
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      for (let i = 0; i < imageUrls.length; i++) {
        console.log(`\n--- Gambar ${i + 1}/${imageUrls.length} ---`);
        const uploadedUrl = await this._upload(imageUrls[i]);
        uploadedUrls.push(uploadedUrl);
      }
      console.log("\n✅ Semua gambar berhasil diunggah.");
    } else {
      console.log("✅ Mode Text-to-Video: Tidak perlu upload gambar.");
    }
    const payload = {
      model: model,
      type: finalType,
      prompt: prompt,
      ...isImageToVideo && {
        image_urls: uploadedUrls
      },
      aspect_ratio: aspect_ratio,
      remove_watermark: remove_watermark
    };
    return await this._submitSora2(payload);
  }
  async _submitSora2(payload) {
    await this._logCookies("Sebelum Submit Sora2");
    if (this.credits < 4) {
      throw new Error(`Kredit tidak mencukupi. Dibutuhkan 4, tersedia: ${this.credits}.`);
    }
    console.log("⏳ Mengirim tugas Sora2...");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    const res = await this.client.post(`${BASE_URL}/api/sora2/submit`, payload);
    if (!res.data?.task_id) {
      throw new Error("Gagal mengirim tugas Sora2: " + (res.data?.error || "Unknown error"));
    }
    this.credits = res.data.remaining_credits || this.credits - 4;
    console.log(`✅ Tugas Sora2 berhasil dikirim. Task ID: ${res.data.task_id} | Sisa kredit: ${this.credits}`);
    return {
      task_id: res.data.task_id,
      status: "submitted",
      type: payload.type,
      remaining_credits: this.credits,
      message: `Task ${payload.type} successfully submitted`
    };
  }
  async status(params) {
    const {
      task_id
    } = params;
    if (!task_id) {
      throw new Error('Paramenter "task_id" diperlukan.');
    }
    await this._authenticate();
    console.log(`⏳ Memeriksa status task: ${task_id}`);
    const res = await this.client.get(`${BASE_URL}/api/sora2/status/${task_id}`);
    console.log(`Status response:`, res.data);
    return {
      task_id: task_id,
      status: res.data?.status || "unknown",
      result: res.data?.result,
      error: res.data?.error,
      progress: res.data?.progress,
      estimated_time: res.data?.estimated_time
    };
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
  const api = new NanoBananaSora2();
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
        return res.status(200).json(response);
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