import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class PixarAIClient {
  constructor() {
    this.axiosInstance = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      withCredentials: true
    });
    this.email = null;
    this.authSession = null;
    this.otherStaticCookies = "NEXT_LOCALE=en; _ga=GA1.1.586971573.1750938945; googleRedirectTo=%2Fcreate-disney-pixar-ai-posters; _ga_V2VZ7TPLL0=GS2.1.s1750938944$o1$g1$t1750939079$j53$l0$h0";
    this.initInterceptors();
  }
  initInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      console.log("✉️ Permintaan terkirim:", config.method.toUpperCase(), config.url, config.data || "");
      return config;
    }, error => {
      console.error("❌ Kesalahan permintaan:", error);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      console.log("✅ Tanggapan diterima:", response.config.url, response.status, response.data);
      return response;
    }, error => {
      console.error("⛔ Kesalahan tanggapan:", error.config.url, error.response ? error.response.status : "No Status", error.message, error.response ? error.response.data : "");
      return Promise.reject(error);
    });
  }
  async getMail() {
    try {
      console.log("Mendapatkan email sementara...");
      const response = await this.axiosInstance.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = response.data.email;
      this.email = email;
      console.log(`Email sementara berhasil dibuat: ${email}`);
      return email;
    } catch (error) {
      console.error("Kesalahan saat mendapatkan email sementara:", error);
      throw new Error(`Gagal mendapatkan email sementara: ${error.message}`);
    }
  }
  async pollOtp(email, timeout = 6e4, interval = 3e3) {
    console.log(`Menunggu pesan OTP untuk email: ${email}...`);
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.axiosInstance.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const messages = response.data.data;
        if (messages && messages.length > 0) {
          for (const message of messages) {
            const textContent = message.text_content;
            const otpMatch = textContent.match(/One-time password:\n(\d{6})/);
            if (otpMatch && otpMatch[1]) {
              const otp = otpMatch[1];
              console.log(`OTP ditemukan: ${otp}`);
              return otp;
            }
          }
        }
      } catch (error) {
        console.warn(`Kesalahan saat polling pesan (akan mencoba lagi): ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Waktu habis menunggu pesan OTP.");
  }
  async signUp(email, password) {
    console.log(`Mendaftar dengan email: ${email}...`);
    try {
      const payload = {
        0: {
          json: {
            email: email,
            password: password,
            callbackUrl: "https://www.pixarai.com/auth/verify"
          }
        }
      };
      const response = await this.axiosInstance.post("https://www.pixarai.com/api/auth.signup?batch=1", payload, {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://www.pixarai.com",
          Referer: "https://www.pixarai.com/create-disney-pixar-ai-posters"
        }
      });
      console.log("Tanggapan pendaftaran:", response.data);
      return response.data;
    } catch (error) {
      console.error("Kesalahan selama pendaftaran:", error);
      throw new Error(`Gagal mendaftar: ${error.message}`);
    }
  }
  async verify(otp, identifier) {
    console.log(`Memverifikasi OTP: ${otp} untuk identifier: ${identifier}...`);
    try {
      const payload = {
        0: {
          json: {
            code: otp,
            type: "SIGNUP",
            identifier: identifier
          }
        }
      };
      const response = await this.axiosInstance.post("https://www.pixarai.com/api/auth.verifyOtp?batch=1", payload, {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://www.pixarai.com",
          Referer: `https://www.pixarai.com/auth/otp?type=SIGNUP&redirectTo=%2Fcreate-disney-pixar-ai-posters&identifier=${encodeURIComponent(identifier)}`
        }
      });
      const sessionData = response.data[0]?.result?.data?.json;
      if (sessionData && sessionData.id) {
        this.authSession = sessionData.id;
        console.log(`OTP berhasil diverifikasi. ID Sesi Otentikasi: ${this.authSession}`);
        return this.authSession;
      } else {
        throw new Error("ID sesi otentikasi tidak ditemukan dalam tanggapan verifikasi OTP.");
      }
    } catch (error) {
      console.error("Kesalahan selama verifikasi OTP:", error);
      throw new Error(`Gagal memverifikasi OTP: ${error.message}`);
    }
  }
  getCookieStr() {
    let cookieString = this.otherStaticCookies;
    if (this.authSession) {
      cookieString = `${cookieString}; auth_session=${this.authSession}`;
    }
    return cookieString;
  }
  async generate({
    prompt,
    modelCategorieId = "clwomm0r6000i52dncommunity",
    otpTimeout = 6e4,
    otpInterval = 3e3,
    ...rest
  }) {
    if (!prompt) {
      throw new Error("Prompt diperlukan untuk pembuatan gambar.");
    }
    try {
      await this.getMail();
      const currentEmail = this.email;
      if (!currentEmail) {
        throw new Error("Tidak dapat memperoleh email sementara.");
      }
      await this.signUp(currentEmail, currentEmail);
      const otp = await this.pollOtp(currentEmail, otpTimeout, otpInterval);
      if (!otp) {
        throw new Error("Tidak dapat mengambil OTP.");
      }
      await this.verify(otp, currentEmail);
      const currentAuthSession = this.authSession;
      if (!currentAuthSession) {
        throw new Error("Tidak dapat memperoleh sesi otentikasi.");
      }
      console.log(`Menghasilkan gambar dengan prompt: "${prompt}" dan model: "${modelCategorieId}"`);
      const payload = {
        0: {
          json: {
            name: prompt,
            modelCategorieId: modelCategorieId
          }
        }
      };
      const cookieHeader = this.getCookieStr();
      const response = await this.axiosInstance.post("https://www.pixarai.com/api/ai.textToImage?batch=1", payload, {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://www.pixarai.com",
          Referer: "https://www.pixarai.com/create-disney-pixar-ai-posters",
          Cookie: cookieHeader
        }
      });
      const resultJson = response.data[0]?.result?.data?.json;
      if (resultJson && resultJson.url) {
        console.log(`Gambar berhasil dihasilkan. URL: ${resultJson.url}, ID: ${resultJson.id}`);
        return resultJson;
      } else {
        throw new Error("Respons pembuatan gambar tidak mengandung URL atau struktur yang diharapkan.");
      }
    } catch (error) {
      console.error("Kesalahan selama proses pembuatan gambar:", error);
      throw new Error(`Pembuatan gambar gagal: ${error.message}`);
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
    const client = new PixarAIClient();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}