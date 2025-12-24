import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import OSS from "ali-oss";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class VideoTube {
  constructor(initialCookie = "i18n_redirected=en;") {
    this.mailApiUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.videoTubeApiUrl = "https://videotube.ai/api/v1";
    this.cookies = initialCookie;
    this.isAuthenticated = false;
    this.stsToken = null;
    this.ossClient = null;
    this.maxRetries = 3;
    this.retryDelay = 5e3;
    this.api = axios.create({
      timeout: 6e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        referer: "https://videotube.ai/"
      }
    });
    this._setupInterceptors();
  }
  _setupInterceptors() {
    this.api.interceptors.request.use(config => {
      if (this.cookies) {
        config.headers["Cookie"] = this.cookies;
      }
      return config;
    });
    this.api.interceptors.response.use(response => {
      this._updateCookies(response.headers["set-cookie"]);
      return response;
    }, error => {
      if (error.response?.headers?.["set-cookie"]) {
        this._updateCookies(error.response.headers["set-cookie"]);
      }
      return Promise.reject(error);
    });
  }
  _updateCookies(setCookieHeader) {
    if (!setCookieHeader) return;
    setCookieHeader.forEach(cookie => {
      const newCookie = cookie.split(";")[0];
      const [cookieName] = newCookie.split("=");
      const cookieParts = this.cookies.split("; ").filter(c => !c.startsWith(`${cookieName}=`));
      cookieParts.push(newCookie);
      this.cookies = cookieParts.join("; ");
    });
    if (this.cookies.includes("_identity=")) {
      this.isAuthenticated = true;
    }
  }
  async _retryWithDelay(fn, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        console.log(`⚠️ Percobaan ${i + 1}/${retries} gagal: ${error.message}`);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
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
  async _performPostAuthenticationRequests() {
    console.log("🚀 Menjalankan permintaan setelah autentikasi...");
    const endpoints = ["https://videotube.ai/api/v1/subscription", "https://videotube.ai/user/v2/userinfo", "https://videotube.ai/api/v1/user-info", "https://videotube.ai/api/v1/new-user-coupon"];
    for (const url of endpoints) {
      try {
        const response = await this.api.get(url);
        console.log(`✅ Berhasil: GET ${url} (Status: ${response.status})`);
      } catch (error) {
        const status = error.response ? error.response.status : "N/A";
        console.warn(`⚠️ Gagal: GET ${url} (Status: ${status}) - ${error.message}`);
      }
    }
  }
  async _createMail() {
    console.log("📧 Membuat email sementara...");
    const response = await this.api.get(`${this.mailApiUrl}?action=create`);
    const email = response.data?.email;
    if (!email) throw new Error("Gagal membuat email");
    console.log(`✅ Email dibuat: ${email}`);
    return email;
  }
  async _sendVerificationLink(email) {
    console.log("📤 Mengirim tautan verifikasi...");
    const password = `Secure${Math.random().toString(36).substring(2, 12)}`;
    const body = new URLSearchParams({
      "User[email]": email,
      "User[password]": password,
      "User[ga_cid]": ""
    });
    await this.api.post("https://videotube.ai/user/register", body, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://videotube.ai",
        referer: "https://videotube.ai/user/register"
      }
    });
    console.log("✅ Tautan verifikasi terkirim");
    return password;
  }
  async _waitForVerificationLink(email, maxWaitTime = 12e4) {
    const startTime = Date.now();
    let attempt = 1;
    const pollInterval = 3e3;
    console.log("🔍 Menunggu tautan verifikasi...");
    while (Date.now() - startTime < maxWaitTime) {
      try {
        console.log(`📨 Memeriksa email (percobaan ${attempt})...`);
        const response = await this.api.get(`${this.mailApiUrl}?action=message&email=${email}`);
        const messages = response.data?.data || [];
        if (messages.length > 0) {
          const latestMessage = messages[0];
          const textContent = latestMessage?.text_content || "";
          const htmlContent = latestMessage?.html_content || "";
          const contentToCheck = textContent + " " + htmlContent;
          if (contentToCheck) {
            const patterns = [/https:\/\/videotube\.ai\/user\/confirm-email\?[^\s<>)"\]]+/gi, /https:\/\/videotube\.ai\/user\/confirm-email\?token=[a-zA-Z0-9_-]+/gi, /(https:\/\/videotube\.ai\/user\/confirm-email[^\s<>)"\]]+)/gi, /videotube\.ai\/user\/confirm-email\?[^\s<>)"\]]+/gi];
            for (const pattern of patterns) {
              const matches = contentToCheck.match(pattern);
              if (matches && matches.length > 0) {
                let link = matches[0];
                if (!link.startsWith("https://")) {
                  link = "https://" + link;
                }
                link = link.replace(/[^\x20-\x7E]/g, "").trim();
                console.log("✅ Tautan verifikasi ditemukan!");
                console.log("🔗 Tautan:", link);
                return link;
              }
            }
            console.log("🔍 Pratinjau konten email (300 karakter pertama):", contentToCheck.substring(0, 300) + "...");
          }
        }
        console.log(`⏳ Belum ada tautan verifikasi. Menunggu ${pollInterval / 1e3}s... (${Math.round((Date.now() - startTime) / 1e3)}s berlalu)`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempt++;
      } catch (error) {
        console.error(`❌ Error saat memeriksa email (percobaan ${attempt}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempt++;
      }
    }
    throw new Error(`Tautan verifikasi tidak diterima dalam ${maxWaitTime / 1e3}s`);
  }
  async _confirmEmail(verificationLink) {
    console.log("🔗 Mengonfirmasi email...");
    const cleanLink = verificationLink.trim().replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, "").replace(/&amp;/g, "&");
    console.log("🔗 Menggunakan tautan verifikasi bersih:", cleanLink);
    await this.api.get(cleanLink, {
      maxRedirects: 10,
      validateStatus: status => status >= 200 && status < 400,
      headers: {
        referer: "https://videotube.ai/user/register",
        origin: "https://videotube.ai"
      }
    });
    try {
      await this.api.get("https://videotube.ai/user/profile");
      this.isAuthenticated = true;
      console.log("✅ Email dikonfirmasi melalui pengecekan profil");
    } catch (profileError) {
      if (this.cookies.includes("_identity=")) {
        this.isAuthenticated = true;
        console.log("✅ Email dikonfirmasi melalui pengecekan cookie");
        return;
      }
      try {
        await this.api.get(`${this.videoTubeApiUrl}/oss/sts-token`);
        this.isAuthenticated = true;
        console.log("✅ Email dikonfirmasi melalui tes API");
      } catch (testError) {
        console.log("⚠️ Semua pengecekan autentikasi gagal, tetapi akan dilanjutkan...");
        this.isAuthenticated = true;
      }
    }
  }
  async authenticate() {
    if (this.isAuthenticated) {
      console.log("✅ Sudah terautentikasi");
      return true;
    }
    console.log("🔐 Memulai proses autentikasi...");
    const success = await this._retryWithDelay(async () => {
      const email = await this._createMail();
      console.log(`[1/3] 📧 Email: ${email}`);
      await this._sendVerificationLink(email);
      console.log(`[2/3] 📤 Tautan verifikasi terkirim`);
      const verificationLink = await this._waitForVerificationLink(email);
      console.log(`[3/3] 🔗 Tautan verifikasi diterima`);
      await this._confirmEmail(verificationLink);
      console.log(`✅ Autentikasi selesai!`);
      return true;
    });
    if (success && this.isAuthenticated) {
      await this._performPostAuthenticationRequests();
    }
    return success;
  }
  async getSTSToken(forceRefresh = false) {
    if (this.stsToken && !forceRefresh) {
      const expirationTime = new Date(this.stsToken.Expiration).getTime();
      const now = Date.now();
      const timeLeft = expirationTime - now;
      if (timeLeft > 5 * 60 * 1e3) {
        console.log("✅ Menggunakan token STS yang ada");
        return this.stsToken;
      }
      console.log("🔄 Token STS akan segera kedaluwarsa, sedang menyegarkan...");
    }
    await this.authenticate();
    await this.checkAvailableCoupons();
    console.log("🔑 Mendapatkan token STS baru...");
    const response = await this.api.get(`${this.videoTubeApiUrl}/oss/sts-token`, {
      headers: {
        referer: "https://videotube.ai/image-to-video",
        origin: "https://videotube.ai"
      }
    });
    const data = response.data;
    if (data?.code !== 1e5) {
      throw new Error(`Gagal mendapatkan Token STS: ${data?.message || "Error tidak diketahui"}`);
    }
    this.stsToken = data.data;
    this.ossClient = null;
    console.log("✅ Token STS berhasil didapatkan");
    console.log("⏰ Token kedaluwarsa pada:", this.stsToken.Expiration);
    return this.stsToken;
  }
  async _createOSSClient() {
    if (this.ossClient && this.stsToken) {
      const expirationTime = new Date(this.stsToken.Expiration).getTime();
      const now = Date.now();
      const timeLeft = expirationTime - now;
      if (timeLeft > 5 * 60 * 1e3) {
        return this.ossClient;
      }
    }
    const stsToken = await this.getSTSToken(true);
    console.log("🔧 Membuat klien OSS...");
    this.ossClient = new OSS({
      region: stsToken.region || "oss-us-west-1",
      accessKeyId: stsToken.AccessKeyId,
      accessKeySecret: stsToken.AccessKeySecret,
      stsToken: stsToken.SecurityToken,
      bucket: stsToken.bucket || "nc-cdn",
      secure: true,
      endpoint: stsToken.endpoint,
      timeout: 6e4,
      retryDelayOptions: {
        custom: {
          200: 1e3,
          300: 2e3,
          400: 3e3
        }
      }
    });
    console.log("✅ Klien OSS berhasil dibuat");
    console.log("🔍 Konfigurasi OSS:", {
      bucket: stsToken.bucket,
      region: stsToken.region,
      endpoint: stsToken.endpoint
    });
    return this.ossClient;
  }
  async uploadToOSS(imageUrl, filename = null) {
    console.log("📥 Mengunduh gambar...");
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
      }
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    console.log(`📊 Ukuran gambar: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    const imageName = filename || `${uuidv4().replace(/-/g, "")}.jpg`;
    const ossPath = `videotube/cover/${imageName}`;
    console.log(`☁️ Mengunggah ke path OSS: ${ossPath}`);
    return await this._retryWithDelay(async () => {
      const ossClient = await this._createOSSClient();
      try {
        const result = await ossClient.put(ossPath, imageBuffer, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "no-cache",
            "x-oss-storage-class": "Standard"
          },
          timeout: 9e4
        });
        if (!result || !result.name) {
          throw new Error("Hasil unggahan tidak valid");
        }
        console.log(`✅ Gambar berhasil diunggah: ${result.name}`);
        console.log(`🔗 URL OSS: ${result.url}`);
        return result.name;
      } catch (ossError) {
        console.error("❌ Error unggah ali-oss:", ossError.message);
        if (ossError.code === "SecurityTokenExpired" || ossError.code === "InvalidAccessKeyId" || ossError.message.includes("token") || ossError.message.includes("expired")) {
          console.log("🔄 Token kedaluwarsa, sedang menyegarkan...");
          this.stsToken = null;
          this.ossClient = null;
          throw new Error("Token kedaluwarsa, perlu coba lagi");
        }
        throw new Error(`Unggahan OSS gagal: ${ossError.code || ossError.message}`);
      }
    });
  }
  async img2vid({
    prompt,
    imageUrl,
    duration = 6,
    ...options
  }) {
    await this.authenticate();
    console.log("🖼️ Memulai konversi gambar ke video...");
    const ossImagePath = await this.uploadToOSS(imageUrl);
    const payload = {
      prompt: prompt,
      first_frame_image: ossImagePath,
      generate_type: 2,
      api_model_platform: "minimax",
      ai_model_name: "I2V-01",
      duration: duration,
      ...options
    };
    console.log("🚀 Meminta pembuatan video...");
    console.log("📝 Prompt:", prompt);
    console.log("🖼️ Path gambar:", ossImagePath);
    const response = await this.api.post(`${this.videoTubeApiUrl}/ai-videos`, payload, {
      headers: {
        origin: "https://videotube.ai",
        referer: "https://videotube.ai/image-to-video",
        "content-type": "application/json"
      }
    });
    if (response.data?.code !== 1e5) {
      throw new Error(`Pembuatan video gagal: ${response.data?.message || "Error tidak diketahui"}`);
    }
    console.log("✅ Pembuatan video berhasil dimulai");
    console.log("🆔 ID Tugas:", response.data.data?.video_uuid);
    const encryptedData = {
      cookies: this.cookies,
      video_uuid: response.data.data?.video_uuid
    };
    console.log(`[LOG] Txt2vid: Tugas video berhasil dibuat. ID terenkripsi: ${await this.enc(encryptedData)}`);
    return await this.enc(encryptedData);
  }
  async txt2vid({
    prompt,
    duration = 6,
    ...options
  }) {
    await this.authenticate();
    console.log("📝 Memulai konversi teks ke video...");
    const payload = {
      prompt: prompt,
      generate_type: 1,
      api_model_platform: "minimax",
      ai_model_name: "T2V-01",
      duration: duration,
      ...options
    };
    console.log("🚀 Meminta pembuatan video...");
    console.log("📝 Prompt:", prompt);
    const response = await this.api.post(`${this.videoTubeApiUrl}/ai-videos`, payload, {
      headers: {
        origin: "https://videotube.ai",
        referer: "https://videotube.ai/text-to-video",
        "content-type": "application/json"
      }
    });
    if (response.data?.code !== 1e5) {
      throw new Error(`Pembuatan video gagal: ${response.data?.message || "Error tidak diketahui"}`);
    }
    console.log("✅ Konversi teks ke video dimulai");
    console.log("🆔 ID Tugas:", response.data.data?.video_uuid);
    const encryptedData = {
      cookies: this.cookies,
      video_uuid: response.data.data?.video_uuid
    };
    console.log(`[LOG] Txt2vid: Tugas video berhasil dibuat. ID terenkripsi: ${await this.enc(encryptedData)}`);
    return await this.enc(encryptedData);
  }
  async status({
    task_id
  }) {
    const decryptedData = await this.dec(task_id);
    const {
      cookies,
      video_uuid
    } = decryptedData;
    if (!cookies) throw new Error("Belum terotentikasi. Jalankan img2vid atau txt2vid terlebih dahulu.");
    if (!video_uuid) throw new Error("taskId diperlukan untuk memeriksa status.");
    this.cookies = cookies;
    const response = await this.api.get(`${this.videoTubeApiUrl}/ai-videos?video_uuid=${video_uuid}`, {
      headers: {
        referer: "https://videotube.ai/my-videos"
      }
    });
    return response.data;
  }
  async checkAvailableCoupons() {
    try {
      await this.authenticate();
      console.log("🎫 Memeriksa kupon yang tersedia...");
      const response = await this.api.get(`${this.videoTubeApiUrl}/user/coupons`, {
        headers: {
          referer: "https://videotube.ai/my-account"
        }
      });
      console.log("🎫 Kupon tersedia:", response.data?.data || []);
      return response.data;
    } catch (error) {
      console.log("⚠️ Tidak dapat memeriksa kupon:", error.message);
      return null;
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
  const client = new VideoTube();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2vid."
          });
        }
        response = await client.img2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        response = await client.txt2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await client.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'txt2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}