import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
const client = wrapper(axios.create());
class Veo3Service {
  constructor() {
    this.baseTempMailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.baseVeoUrl = "https://veo3.studio/api";
    this.supabaseUrl = "https://cmqnphdipomuuwsplfgv.supabase.co/auth/v1/otp";
    this.supabaseRestUrl = "https://cmqnphdipomuuwsplfgv.supabase.co/rest/v1";
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcW5waGRpcG9tdXV3c3BsZmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODIzMzIsImV4cCI6MjA2MzU1ODMzMn0._p6qwLmco7JY6bWBHfouBIHCIHBHfUMgLyMNd-IGrS0";
    this.email = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    this.codeVerifier = null;
    this.isAuthenticated = false;
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      timeout: 3e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ...SpoofHead()
      }
    }));
    this.axiosInstance.interceptors.response.use(response => response, error => {
      console.error("Request failed:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    });
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
  async extractAuthDataFromCookie() {
    try {
      const cookies = await this.cookieJar.getCookies("https://veo3.studio");
      const authCookie = cookies.find(cookie => cookie.key === "sb-cmqnphdipomuuwsplfgv-auth-token");
      if (!authCookie) {
        throw new Error("Auth cookie tidak ditemukan");
      }
      const cookieValue = authCookie.value.replace("base64-", "");
      const decodedValue = Buffer.from(cookieValue, "base64").toString("utf-8");
      const authData = JSON.parse(decodedValue);
      console.log("✅ Data auth berhasil diekstrak dari cookie");
      return authData;
    } catch (error) {
      console.error("❌ Gagal mengekstrak data auth dari cookie:", error.message);
      throw error;
    }
  }
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString("base64url");
  }
  generateCodeChallenge(verifier) {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
  }
  async createTempMail() {
    try {
      const response = await this.axiosInstance.get(`${this.baseTempMailUrl}?action=create`);
      this.email = response.data.email;
      console.log("✅ Email sementara dibuat:", this.email);
      return this.email;
    } catch (error) {
      console.error("❌ Gagal membuat email sementara:", error.message);
      throw error;
    }
  }
  async checkOTP() {
    if (!this.email) {
      throw new Error("Email belum dibuat");
    }
    try {
      const response = await this.axiosInstance.get(`${this.baseTempMailUrl}?action=message&email=${this.email}`);
      if (response.data.data && response.data.data.length > 0) {
        const textContent = response.data.data[0].text_content;
        const otpMatch = textContent.match(/\b\d{6}\b/);
        if (otpMatch) {
          const otp = otpMatch[0];
          console.log("✅ OTP ditemukan:", otp);
          return otp;
        }
      }
      return null;
    } catch (error) {
      console.error("❌ Gagal memeriksa OTP:", error.message);
      throw error;
    }
  }
  async waitForOTP(maxAttempts = 60, interval = 3e3) {
    console.log("⏳ Menunggu OTP...");
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const otp = await this.checkOTP();
        if (otp) {
          return otp;
        }
        console.log(`⏳ Menunggu OTP... (${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error("❌ Error saat menunggu OTP:", error.message);
      }
    }
    throw new Error("OTP tidak ditemukan dalam waktu yang ditentukan");
  }
  async requestOTP() {
    if (!this.email) {
      throw new Error("Email belum dibuat");
    }
    try {
      this.codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
      const response = await this.axiosInstance.post(this.supabaseUrl, {
        email: this.email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: codeChallenge,
        code_challenge_method: "s256"
      }, {
        headers: {
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json;charset=UTF-8",
          origin: "https://veo3.studio",
          priority: "u=1, i",
          referer: "https://veo3.studio/",
          "sec-fetch-site": "cross-site",
          "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
          "x-supabase-api-version": "2024-01-01",
          ...SpoofHead()
        }
      });
      await this.cookieJar.setCookie(`sb-cmqnphdipomuuwsplfgv-auth-token-code-verifier=base64-"${Buffer.from(this.codeVerifier).toString("base64")}"; Path=/; Domain=veo3.studio`, "https://veo3.studio");
      console.log(response.data);
      console.log("✅ Permintaan OTP berhasil dikirim");
      return response.data;
    } catch (error) {
      console.error("❌ Gagal meminta OTP:", error.message);
      throw error;
    }
  }
  async verifyOTP(otp) {
    if (!this.email) {
      throw new Error("Email belum dibuat");
    }
    try {
      const response = await this.axiosInstance.post(`${this.baseVeoUrl}/auth/verificationCode`, {
        email: this.email,
        verificationCode: otp
      }, {
        headers: {
          "content-type": "application/json",
          origin: "https://veo3.studio",
          priority: "u=1, i",
          referer: "https://veo3.studio/create",
          ...SpoofHead()
        }
      });
      console.log(response.data);
      const authData = await this.extractAuthDataFromCookie();
      if (authData.access_token) {
        this.accessToken = authData.access_token;
      }
      if (authData.refresh_token) {
        this.refreshToken = authData.refresh_token;
      }
      if (authData.user?.id) {
        this.userId = authData.user.id;
      }
      this.isAuthenticated = true;
      console.log("✅ OTP berhasil diverifikasi dan autentikasi berhasil");
      console.log(authData);
      return authData;
    } catch (error) {
      console.error("❌ Gagal memverifikasi OTP:", error.message);
      throw error;
    }
  }
  async claimCredits() {
    if (!this.isAuthenticated || !this.accessToken || !this.userId) {
      throw new Error("Belum terautentikasi. Lakukan autentikasi terlebih dahulu.");
    }
    try {
      console.log("💰 Menclaim kredit gratis...");
      const response = await this.axiosInstance.patch(`${this.supabaseRestUrl}/profiles?id=eq.${this.userId}`, {
        free_credits: 200
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          apikey: this.apiKey,
          authorization: `Bearer ${this.accessToken}`,
          "content-profile": "public",
          "content-type": "application/json",
          origin: "https://veo3.studio",
          prefer: "",
          priority: "u=1, i",
          referer: "https://veo3.studio/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
          ...SpoofHead()
        }
      });
      console.log("✅ Berhasil menclaim 200 kredit gratis!");
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Gagal menclaim kredit:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }
  async ensureAuth() {
    if (this.isAuthenticated && this.accessToken && this.userId) {
      console.log("✅ Sudah terautentikasi");
      return;
    }
    console.log("🔐 Memulai proses autentikasi...");
    try {
      await this.createTempMail();
      await this.requestOTP();
      const otp = await this.waitForOTP();
      await this.verifyOTP(otp);
      await this.claimCredits();
      console.log("✅ Autentikasi dan claim kredit berhasil");
    } catch (error) {
      console.error("❌ Gagal melakukan autentikasi:", error.message);
      throw error;
    }
  }
  async txt2vid({
    prompt,
    model = "fast",
    aspect_ratio = "9:16",
    is_private = false,
    ...rest
  }) {
    try {
      await this.ensureAuth();
      const encryptData = Buffer.from(JSON.stringify({
        token: this.accessToken,
        verifier: this.codeVerifier,
        userid: this.userId,
        cookies: await this.cookieJar.getCookieString("https://veo3.studio")
      })).toString("base64");
      console.log(encryptData);
      const requestData = JSON.stringify({
        model: model,
        generation_type: "text-to-video",
        image_urls: [],
        watermark: "",
        prompt: prompt,
        aspect_ratio: aspect_ratio,
        user_id: this.userId,
        is_private: is_private,
        ...rest
      });
      console.log("🎬 Membuat permintaan video...");
      const response = await this.axiosInstance.post(`${this.baseVeoUrl}/create/damo`, requestData, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/json",
          origin: "https://veo3.studio",
          priority: "u=1, i",
          referer: "https://veo3.studio/create",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      console.log("✅ Permintaan pembuatan video berhasil");
      console.log(response.data);
      const task_id = await this.enc({
        base64: encryptData
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("❌ Gagal membuat permintaan video:", error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        base64
      } = decryptedData;
      if (!base64) {
        throw new Error("Invalid task_id: Missing videoId after decryption.");
      }
      const encryptData = JSON.parse(Buffer.from(base64, "base64").toString());
      const {
        userid,
        cookies
      } = encryptData;
      const tempCookieJar = new CookieJar();
      if (cookies) {
        await tempCookieJar.setCookie(cookies, "https://veo3.studio");
      }
      const tempAxiosInstance = wrapper(axios.create({
        jar: tempCookieJar,
        withCredentials: true,
        timeout: 3e4,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          ...SpoofHead()
        }
      }));
      console.log("📊 Memeriksa status video...");
      const response = await tempAxiosInstance.get(`${this.baseVeoUrl}/create/damo/recent-video?user_id=${userid}`, {
        headers: {
          priority: "u=1, i",
          referer: "https://veo3.studio/create",
          ...SpoofHead()
        }
      });
      console.log(response.data);
      console.log("✅ Status video berhasil diperoleh");
      return response.data;
    } catch (error) {
      console.error("❌ Gagal memeriksa status video:", error.message);
      throw error;
    }
  }
  getAuthInfo() {
    return {
      isAuthenticated: this.isAuthenticated,
      email: this.email,
      userId: this.userId,
      hasAccessToken: !!this.accessToken
    };
  }
  async getCookiesString() {
    return await this.cookieJar.getCookieString("https://veo3.studio");
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
  const veo3Service = new Veo3Service();
  try {
    let response;
    switch (action) {
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        const txt2vid_task = await veo3Service.txt2vid(params);
        return res.status(200).json(txt2vid_task);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await veo3Service.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'txt2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}