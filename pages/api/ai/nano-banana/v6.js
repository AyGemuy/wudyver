import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
const TEMP_MAIL_API = `https://${apiConfig.DOMAIN_URL}/api/mails/v22`;
const BASE_URL = "https://nanobanana.org";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class NanoBanana {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        "accept-language": "id-ID",
        origin: BASE_URL,
        priority: "u=1, i",
        referer: `${BASE_URL}/`,
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
  extractOTP(fullText) {
    if (!fullText) return null;
    const otpMatch = fullText.match(/(\b\d{6}\b)/);
    return otpMatch ? otpMatch[1] : null;
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
      const email = mailResponse.data?.email;
      if (!email) throw new Error("Gagal membuat email.");
      console.log(`✉️  Email dibuat: ${email}`);
      await this.client.post(`${BASE_URL}/api/auth/send-code`, {
        email: email
      });
      console.log("✅ Kode verifikasi terkirim.");
      let otp = null;
      console.log("⏳ Memeriksa OTP (polling)...");
      for (let i = 0; i < 60; i++) {
        const otpResponse = await this.client.get(`${TEMP_MAIL_API}?action=inbox&id=${email.split("@")[0]}`);
        otp = this.extractOTP(otpResponse.data?.messages?.[0]?.subject);
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
    console.log("⏳ Mengunjungi halaman utama untuk alokasi kredit...");
    await this.client.get(BASE_URL, {
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
    console.log("✅ Kunjungan ke halaman utama berhasil.");
    await this._logCookies("Setelah Kunjungan Halaman Utama");
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
  async generate({
    prompt,
    imageUrl = null,
    num_images = 1,
    ...rest
  }) {
    if (!prompt) throw new Error('Paramenter "prompt" diperlukan.');
    await this._authenticate();
    const type = imageUrl ? "image-to-image" : "text-to-image";
    console.log(`🚀 Memulai tugas: ${type} (${num_images} gambar)`);
    const allResults = [];
    for (const [index, _] of Array.from({
        length: num_images
      }).entries()) {
      console.log(`\n📸 Generate ke-${index + 1}/${num_images}`);
      const payload = {
        type: type,
        prompt: prompt,
        num_images: 1,
        ...rest
      };
      if (imageUrl) {
        const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        const uploadedUrls = [];
        console.log(`Mengunggah ${imageUrls.length} gambar...`);
        for (const url of imageUrls) {
          const uploadedUrl = await this._upload(url);
          uploadedUrls.push(uploadedUrl);
        }
        payload.image_urls = uploadedUrls;
        console.log("✅ Semua gambar berhasil diunggah.");
      }
      const taskId = await this._submit(payload);
      const result = await this._polling(taskId);
      allResults.push({
        index: index + 1,
        taskId: taskId,
        ...result
      });
      console.log(`✅ Generate ke-${index + 1} selesai!`);
      if (index < num_images - 1) {
        console.log("⏳ Menunggu 2 detik sebelum request berikutnya...");
        await delay(2e3);
      }
    }
    console.log(`\n🎉 SEMUA ${num_images} GAMBAR BERHASIL DIGENERATE!`);
    return {
      total: num_images,
      results: allResults
    };
  }
  async _upload(imageUrl) {
    console.log("⏳ Mengunggah gambar...");
    let fileBuffer;
    if (Buffer.isBuffer(imageUrl)) fileBuffer = imageUrl;
    else if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
      const res = await this.client.get(imageUrl, {
        responseType: "arraybuffer"
      });
      fileBuffer = Buffer.from(res.data);
    } else if (typeof imageUrl === "string") fileBuffer = Buffer.from(imageUrl, "base64");
    else throw new Error("Format imageUrl tidak didukung.");
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: "image.png"
    });
    const res = await this.client.post(`${BASE_URL}/api/upload`, form, {
      headers: form.getHeaders()
    });
    if (!res.data?.success || !res.data.url) throw new Error("Gagal mengunggah gambar.");
    console.log("✅ Gambar berhasil diunggah:", res.data.url);
    return res.data.url;
  }
  async _submit(payload) {
    await this._logCookies("Sebelum Submit Generate");
    if (this.credits < 4) throw new Error(`Kredit tidak mencukupi. Dibutuhkan 4, tersedia: ${this.credits}.`);
    console.log("⏳ Mengirim tugas generate...");
    const res = await this.client.post(`${BASE_URL}/api/nano-banana/kie/submit`, payload);
    if (!res.data?.success || !res.data.task_id) throw new Error("Gagal mengirim tugas.");
    this.credits = res.data.remaining_credits;
    console.log(`✅ Tugas berhasil dikirim. Task ID: ${res.data.task_id} | Sisa kredit: ${this.credits}`);
    return res.data.task_id;
  }
  async _polling(taskId) {
    console.log("⏳ Menunggu hasil gambar (polling)...");
    for (let i = 0; i < 60; i++) {
      const res = await this.client.get(`${BASE_URL}/api/nano-banana/status/${taskId}`);
      if (res.data?.status === "completed") {
        console.log("\n✅ Tugas selesai!");
        return res.data.result;
      } else if (res.data?.status === "failed") {
        throw new Error(`Proses task gagal: ${res.data.error || "Alasan tidak diketahui"}`);
      }
      process.stdout.write(`...`);
      await delay(3e3);
    }
    throw new Error("Gagal mendapatkan hasil gambar setelah waktu yang lama.");
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