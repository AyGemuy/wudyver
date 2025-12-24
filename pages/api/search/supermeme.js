import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class SuperMeme {
  constructor() {
    this.supabaseUrl = "https://hlhmmkpugruknefsttlr.supabase.co";
    this.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQyNzg1NjkzLCJleHAiOjE5NTgzNjE2OTN9._oD1XWLrvhw0Yc0TCPA-ujflEd929zr_f08bLdjUK0g";
    this.api = axios.create({
      headers: {
        apikey: this.supabaseAnonKey,
        "content-type": "application/json",
        origin: "https://supermeme.ai",
        referer: "https://supermeme.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        "accept-language": "id-ID"
      },
      timeout: 6e4
    });
    this.currentToken = null;
    this.log("SuperMemeGenerator initialized");
  }
  log(...msg) {
    console.log("[SuperMeme]", ...msg);
  }
  error(...msg) {
    console.error("[SuperMeme ERROR]", ...msg);
  }
  setToken(token) {
    if (token) {
      this.api.defaults.headers.authorization = `Bearer ${token}`;
      this.currentToken = token;
      this.log("Token set & ready");
    } else {
      delete this.api.defaults.headers.authorization;
      this.currentToken = null;
    }
  }
  async createTemporaryEmail() {
    try {
      const {
        data
      } = await this.api.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9`, {
        params: {
          action: "create"
        }
      });
      if (!data?.email) throw new Error("No email returned");
      this.log("Temp email:", data.email);
      return data.email;
    } catch (e) {
      throw new Error(`Create email failed: ${e.message}`);
    }
  }
  async getOtpFromInbox(email) {
    try {
      for (let i = 1; i <= 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const {
          data
        } = await this.api.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9`, {
          params: {
            action: "message",
            email: email
          }
        });
        const match = data?.data?.[0]?.text_content?.match(/\d{6}/);
        if (match) {
          this.log("OTP received:", match[0]);
          return match[0];
        }
        if (i % 10 === 0) this.log(`Waiting for OTP... (${i}s)`);
      }
      throw new Error("OTP timeout after 3 minutes");
    } catch (e) {
      throw new Error(`Get OTP failed: ${e.message}`);
    }
  }
  async requestOtp(email) {
    try {
      await this.api.post(`${this.supabaseUrl}/auth/v1/otp`, {
        email: email,
        create_user: true,
        data: {},
        gotrue_meta_security: {},
        code_challenge: "r9SHGv_5QNxcWfY43TsUJuSH7esEt_LwjLG-eCib1MM",
        code_challenge_method: "s256"
      });
      this.log("OTP request sent");
    } catch (e) {
      throw new Error(`Request OTP failed: ${e.response?.data?.msg || e.message}`);
    }
  }
  async verifyOtp(email, otp) {
    try {
      const {
        data
      } = await this.api.post(`${this.supabaseUrl}/auth/v1/verify`, {
        email: email,
        token: otp,
        type: "email",
        gotrue_meta_security: {}
      });
      if (!data?.access_token) throw new Error("No access_token");
      this.setToken(data.access_token);
      this.log("Login successful");
      return data.access_token;
    } catch (e) {
      throw new Error(`Verify OTP failed: ${e.response?.data?.msg || e.message}`);
    }
  }
  async generate({
    token = null,
    mode = "img",
    prompt,
    input = "id",
    output = "id",
    count = 10
  }) {
    try {
      this.log(`\nGenerating ${mode.toUpperCase()}: "${prompt}"`);
      if (token) {
        this.setToken(token);
      }
      if (!this.currentToken) {
        this.log("No token → auto login");
        const email = await this.createTemporaryEmail();
        await this.requestOtp(email);
        const otp = await this.getOtpFromInbox(email);
        await this.verifyOtp(email, otp);
      } else {
        this.log("Using existing token");
      }
      const endpoint = mode === "gif" ? "https://api-prd.supermeme.ai/api/v1/meme/text-to-gif" : "https://api-prd.supermeme.ai/api/v1/meme/text-to-meme";
      const payload = {
        text: prompt,
        maxDimension: 512,
        inputLanguage: input,
        outputLanguage: output,
        ...mode === "gif" && {
          imageCount: count
        }
      };
      this.log("Sending generation request...");
      const {
        data
      } = await this.api.post(endpoint, payload);
      const results = data?.results || [];
      this.log(`Success! ${results.length} result(s) generated`);
      return {
        result: results,
        token: this.currentToken
      };
    } catch (e) {
      this.error("Generate failed:", e.message);
      throw e;
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
  const api = new SuperMeme();
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