import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  Blob,
  FormData
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class AiGreemAutomator {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.email = null;
    this.password = null;
    this.verificationLink = null;
    this.csrfToken = null;
    this.memberId = null;
    this.buildId = null;
    this.sessionToken = null;
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.userAgents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit=537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/533.36"];
    this.defaultHeaders = {};
    this.updateRandomHeaders();
    this.client.interceptors.response.use(response => response, error => Promise.reject(error));
  }
  getRandomUserAgent() {
    const randomIndex = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[randomIndex];
  }
  getRandomIpAddress() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join(".");
  }
  updateRandomHeaders() {
    const userAgent = this.getRandomUserAgent();
    const randomIp = this.getRandomIpAddress();
    this.defaultHeaders = {
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent": userAgent,
      priority: "u=0, i",
      "sec-ch-ua": `"${userAgent.includes("Chrome") ? "Chromium" : "Not A(Brand)"}";v="99", "Google Chrome";v="99"`,
      "sec-ch-ua-mobile": userAgent.includes("Mobile") ? "?1" : "?0",
      "sec-ch-ua-platform": userAgent.includes("Windows") ? '"Windows"' : userAgent.includes("Macintosh") ? '"macOS"' : userAgent.includes("Android") ? '"Android"' : '"Linux"',
      "X-Forwarded-For": randomIp,
      "True-Client-IP": randomIp,
      "Client-IP": randomIp,
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Cache-Control": "no-cache"
    };
  }
  async _getAndSetSessionToken() {
    const cookies = await this.jar.getCookies("https://aigreem.com");
    const sessionCookie = cookies.find(c => c.key === "__Secure-next-auth.session-token");
    if (sessionCookie) {
      this.sessionToken = sessionCookie.value;
      return true;
    }
    return false;
  }
  _handleError(stepName, error) {
    const errorMessage = error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`[❌ GAGAL] ${stepName}: ${errorMessage}`);
    throw error;
  }
  async createDisposableEmail() {
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 1] Membuat email sementara...");
    try {
      const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`, {
        headers: this.defaultHeaders
      });
      if (response.data?.email && response.data?.uuid) {
        this.email = response.data.email;
        this.password = response.data.uuid;
        console.log(`[✅ BERHASIL] Email: ${this.email}`);
        return {
          email: this.email,
          password: this.password
        };
      } else {
        throw new Error("Struktur respons email tidak valid.");
      }
    } catch (error) {
      this._handleError("Membuat email sementara", error);
    }
  }
  async signup() {
    if (!this.email || !this.password) throw new Error("Email atau password belum ada.");
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 2] Mendaftar akun AI Greem...");
    try {
      const response = await this.client.post("https://aigreem.com/api/account/createMember", {
        email: this.email,
        password: this.password,
        referer: null,
        locale: "EN"
      }, {
        headers: {
          ...this.defaultHeaders,
          "content-type": "application/json",
          origin: "https://aigreem.com",
          referer: "https://aigreem.com/en/signup"
        }
      });
      if (response.status === 200 && response.data?.id) {
        this.memberId = response.data.id;
        console.log(`[✅ BERHASIL] Pendaftaran akun: ${this.memberId}`);
        return true;
      } else {
        throw new Error(`Respons pendaftaran tidak diharapkan: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this._handleError("Mendaftar akun", error);
    }
  }
  async getCsrfToken() {
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 3] Mengambil CSRF token...");
    try {
      const response = await this.client.get("https://aigreem.com/api/auth/csrf", {
        headers: {
          ...this.defaultHeaders,
          referer: "https://aigreem.com/en/signup"
        }
      });
      if (response.data?.csrfToken) {
        this.csrfToken = response.data.csrfToken;
        console.log(`[✅ BERHASIL] CSRF token didapat.`);
        return this.csrfToken;
      } else {
        throw new Error("Gagal mendapatkan CSRF token.");
      }
    } catch (error) {
      this._handleError("Mengambil CSRF token", error);
    }
  }
  async login() {
    if (!this.email || !this.password) throw new Error("Email atau password belum ada.");
    if (!this.csrfToken) await this.getCsrfToken();
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 4] Mencoba login...");
    try {
      const response = await this.client.post("https://aigreem.com/api/auth/callback/credentials?", new URLSearchParams({
        email: this.email,
        password: this.password,
        redirect: "false",
        csrfToken: this.csrfToken,
        callbackUrl: "https://aigreem.com/en/signup",
        json: "true"
      }).toString(), {
        headers: {
          ...this.defaultHeaders,
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://aigreem.com",
          referer: "https://aigreem.com/en/signup"
        },
        validateStatus: status => status >= 200 && status < 300
      });
      if (response.data?.url === "https://aigreem.com/en/signup" || response.data?.error === "CredentialsSignin") {
        console.log("[ℹ️ INFO] Login mengarahkan ke halaman pendaftaran/gagal, butuh verifikasi email.");
        return false;
      } else if (response.data?.url === "http://localhost:3000") {
        console.log("[✅ BERHASIL] Login.");
        await this._getAndSetSessionToken();
        return true;
      } else {
        throw new Error("Login gagal atau respons tidak seperti yang diharapkan.");
      }
    } catch (error) {
      this._handleError("Login", error);
    }
  }
  async getSessionStatus() {
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 5] Memeriksa status sesi...");
    try {
      const response = await this.client.get("https://aigreem.com/api/auth/session", {
        headers: {
          ...this.defaultHeaders,
          referer: "https://aigreem.com/en/signup"
        }
      });
      console.log("[✅ BERHASIL] Status sesi diperiksa.");
      await this._getAndSetSessionToken();
      return response.data;
    } catch (error) {
      this._handleError("Memeriksa status sesi", error);
    }
  }
  async _fetchBuildId() {
    if (this.buildId) return;
    try {
      const homePageResponse = await this.client.get("https://aigreem.com/en/signup", {
        headers: this.defaultHeaders
      });
      const buildIdMatch = homePageResponse.data.match(/"buildId":"([^"]+)"/);
      if (buildIdMatch && buildIdMatch[1]) {
        this.buildId = buildIdMatch[1];
        console.log(`[ℹ️ INFO] Build ID: ${this.buildId.substring(0, 8)}...`);
      } else {
        console.warn("[⚠️ PERINGATAN] Gagal mengambil Build ID, menggunakan placeholder.");
        this.buildId = "gOylrKANKm7zQBfEhllPA";
      }
    } catch (error) {
      console.warn("[⚠️ PERINGATAN] Error saat mengambil Build ID, menggunakan placeholder.");
      this.buildId = "gOylrKANKm7zQBfEhllPA";
    }
  }
  async fetchSignupConfirmData() {
    if (!this.memberId || !this.email) throw new Error("ID member atau email belum tersedia.");
    await this._fetchBuildId();
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 6] Mengambil data konfirmasi pendaftaran...");
    try {
      const encodedEmail = encodeURIComponent(this.email);
      const url = `https://aigreem.com/_next/data/${this.buildId}/en/signup-confirm.json?id=${this.memberId}&email=${encodedEmail}`;
      const response = await this.client.get(url, {
        headers: {
          ...this.defaultHeaders,
          referer: "https://aigreem.com/en/signup",
          "x-nextjs-data": "1"
        }
      });
      if (response.status === 200 && response.data) {
        console.log("[✅ BERHASIL] Data konfirmasi pendaftaran diambil.");
        return response.data;
      } else {
        throw new Error("Gagal mengambil data konfirmasi pendaftaran.");
      }
    } catch (error) {
      this._handleError("Mengambil data konfirmasi pendaftaran", error);
    }
  }
  async sendVerificationMail() {
    if (!this.memberId) throw new Error("ID member tidak ditemukan.");
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 7] Mengirim permintaan verifikasi email...");
    try {
      const response = await this.client.post("https://aigreem.com/api/mail/sendVerify", {
        id: this.memberId
      }, {
        headers: {
          ...this.defaultHeaders,
          "content-type": "application/json",
          origin: "https://aigreem.com",
          referer: "https://aigreem.com/en/signup-confirm"
        }
      });
      console.log("[✅ BERHASIL] Permintaan verifikasi email terkirim.");
      return response.data;
    } catch (error) {
      this._handleError("Mengirim verifikasi email", error);
    }
  }
  async checkVerificationEmail(maxRetries = 60, delay = 3e3) {
    if (!this.email) throw new Error("Email belum dibuat.");
    console.log(`[🌀 LANGKAH 8] Mencari link verifikasi untuk ${this.email}...`);
    for (let i = 0; i < maxRetries; i++) {
      this.updateRandomHeaders();
      try {
        const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`, {
          headers: this.defaultHeaders
        });
        if (response.data?.data?.length > 0) {
          const latestEmail = response.data.data[0];
          const textContent = latestEmail.text_content;
          const linkRegex = /\[Authenticate\]\((https:\/\/aigreem\.com\/en\/verification\/[a-zA-Z0-9-]+)\)/;
          const match = textContent.match(linkRegex);
          if (match && match[1]) {
            this.verificationLink = match[1];
            console.log(`[✅ BERHASIL] Link verifikasi ditemukan.`);
            return this.verificationLink;
          }
        }
      } catch (error) {
        console.warn(`[⚠️ PERINGATAN] Gagal memeriksa email (percobaan ${i + 1}/${maxRetries}): ${error.message}`);
      }
      if (i < maxRetries - 1) {
        console.log(`[ℹ️ INFO] Link belum ditemukan. Mengulang dalam ${delay / 1e3} detik...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("Gagal menemukan link verifikasi setelah banyak percobaan.");
  }
  async activateAccount() {
    if (!this.verificationLink) throw new Error("Link verifikasi belum ditemukan.");
    this.updateRandomHeaders();
    console.log(`[🌀 LANGKAH 9] Mengaktifkan akun...`);
    try {
      const response = await this.client.get(this.verificationLink, {
        headers: {
          ...this.defaultHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      if (response.status === 200 && typeof response.data === "string") {
        const scriptDataRegex = /<script id="__NEXT_DATA__" type="application\/json">\s*({.*?})\s*<\/script>/s;
        const match = response.data.match(scriptDataRegex);
        if (match && match[1]) {
          try {
            const nextData = JSON.parse(match[1]);
            if (nextData.props?.pageProps?.userInfo?.is_verified === true) {
              console.log("[✅ BERHASIL] Akun diaktifkan via __NEXT_DATA__.");
              await this._getAndSetSessionToken();
              return true;
            }
          } catch (parseError) {
            console.warn("[⚠️ PERINGATAN] Gagal mem-parsing JSON __NEXT_DATA__.");
          }
        }
      }
      if (response.status === 302 || response.status === 303) {
        console.log("[✅ BERHASIL] Akun kemungkinan besar diaktifkan (redirect terdeteksi).");
        await this._getAndSetSessionToken();
        return true;
      } else if (response.status === 200 && response.data.includes("Account verified successfully")) {
        console.log("[✅ BERHASIL] Akun diaktifkan (pesan sukses terdeteksi).");
        await this._getAndSetSessionToken();
        return true;
      } else if (response.status === 200 && response.data.includes("You are already signed in.")) {
        console.log("[ℹ️ INFO] Akun sudah aktif/login.");
        await this._getAndSetSessionToken();
        return true;
      }
      throw new Error("Respons aktivasi tidak seperti yang diharapkan.");
    } catch (error) {
      this._handleError("Mengaktifkan akun", error);
    }
  }
  async toBaseUri(url) {
    try {
      console.log(`[🌀 CONVERT] Mengambil gambar dari URL: ${url}`);
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"];
      if (!contentType || !contentType.startsWith("image/")) {
        throw new Error("URL tidak mengarah ke gambar yang valid.");
      }
      const base64 = Buffer.from(response.data).toString("base64");
      console.log(`[✅ BERHASIL] Gambar dari URL dikonversi ke Base64.`);
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      this._handleError(`Mengkonversi URL gambar ke Base64 (${url})`, error);
    }
  }
  async getBaseUri(uploadImage) {
    if (typeof uploadImage === "string") {
      if (uploadImage.startsWith("https://")) {
        return await this.toBaseUri(uploadImage);
      } else if (uploadImage.startsWith("data:")) {
        return uploadImage;
      }
    } else if (Buffer.isBuffer(uploadImage)) {
      const mimeType = "image/jpeg";
      return `data:${mimeType};base64,` + uploadImage.toString("base64");
    }
    return null;
  }
  async createImage(prompt = "2girls, bouncingbreasts, from side, nightclub, pale_face, layered_skirt, pointy_hair, heavy_ears, white_eyes, aviator_sunglasses", negativePrompt = "", width = 512, height = 768, model = "Realistic Western", batchSize = 1, seed = 8138832975, scale = 7, qualityTag = true, cleanFilter = true, rndSeedSwitch = true, generated = "txt2img", uploadImage = "", denoising = "") {
    await this._getAndSetSessionToken();
    if (!this.sessionToken) {
      throw new Error("Anda harus login dan memiliki session token untuk membuat gambar.");
    }
    this.updateRandomHeaders();
    console.log("[🌀 LANGKAH 10] Mengirim permintaan pembuatan gambar...");
    try {
      if (!this.memberId) {
        console.warn("[⚠️ PERINGATAN] memberId belum diatur, menggunakan ID placeholder untuk createImage.");
        this.memberId = "99fd9c30-83bf-4941-8e0c-15e511b4999a";
      }
      const payload = {
        id: this.memberId,
        cost: 5,
        prompt: prompt,
        negativePrompt: negativePrompt,
        width: width,
        height: height,
        model: model,
        batchSize: batchSize,
        seed: seed,
        scale: scale,
        qualityTag: qualityTag,
        cleanFilter: cleanFilter,
        rndSeedSwitch: rndSeedSwitch,
        generated: generated,
        uploadImage: await this.getBaseUri(uploadImage),
        denoising: denoising
      };
      const response = await this.client.post("https://aigreem.com/api/aigreem/createImage", payload, {
        headers: {
          ...this.defaultHeaders,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://aigreem.com",
          referer: "https://aigreem.com/en"
        }
      });
      console.log("[✅ BERHASIL] Permintaan pembuatan gambar terkirim.");
      return response.data;
    } catch (error) {
      this._handleError("Membuat gambar", error);
    }
  }
  toBuffer(inputString) {
    const base64Data = inputString.startsWith("data:") ? inputString.split(",")[1] : inputString;
    return Buffer.from(base64Data, "base64");
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async generate(options = {}) {
    try {
      console.log("\n--- Memulai Otomatisasi AI Greem ---");
      await this.createDisposableEmail();
      await this.signup();
      await this.getCsrfToken();
      let loggedIn = await this.login();
      if (!loggedIn) {
        await this.getSessionStatus();
        await this.fetchSignupConfirmData();
        await this.sendVerificationMail();
        const verificationLink = await this.checkVerificationEmail();
        await this.activateAccount();
        console.log("[ℹ️ INFO] Akun telah diverifikasi dan diaktifkan. Lanjut ke pembuatan gambar.");
      } else {
        console.log("[ℹ️ INFO] Login berhasil. Lanjut ke pembuatan gambar.");
        await this.getSessionStatus();
      }
      const imageGenerationResult = await this.createImage(options.prompt, options.negativePrompt, options.width, options.height, options.model, options.batchSize, options.seed, options.scale, options.qualityTag, options.cleanFilter, options.rndSeedSwitch, options.generated, options.uploadImage, options.denoising);
      let finalResult = {
        ...imageGenerationResult
      };
      if (finalResult.images && Array.isArray(finalResult.images) && finalResult.images.length > 0) {
        const uploadedImageUrls = [];
        for (const base64Image of finalResult.images) {
          const imageUrl = await this.uploadImage(this.toBuffer(base64Image));
          uploadedImageUrls.push(imageUrl);
        }
        finalResult.images = uploadedImageUrls;
      } else {
        console.warn("[⚠️ PERINGATAN] Tidak ada gambar yang dihasilkan atau format tidak sesuai untuk diunggah.");
      }
      console.log("\n[✨ SELESAI] Otomatisasi berhasil!");
      console.log("[FINAL RESULT] Hasil: ", finalResult);
      return finalResult;
    } catch (error) {
      this._handleError("Otomatisasi Penuh", error);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new AiGreemAutomator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}