import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
class ImageColorizer {
  constructor() {
    this.cfg = {
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      api: "https://api.magickimg.com",
      hdrs: {
        accept: "application/json, text/plain, */*",
        origin: "https://magickimg.com",
        referer: "https://magickimg.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    };
  }
  slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  rndPw(len = 8) {
    return `Ai_${crypto.randomBytes(len).toString("hex")}@!`;
  }
  genAppId() {
    return crypto.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => (c === "x" ? Math.random() * 16 | 0 : Math.random() * 16 | 0 & 3 | 8).toString(16));
  }
  async getBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith?.("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const raw = input?.includes?.("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(raw || "", "base64");
    } catch (e) {
      throw new Error(`Buffer Resolve Error: ${e.message}`);
    }
  }
  async pollOtp(email) {
    console.log(`[Process] Polling OTP for: ${email}`);
    for (let i = 0; i < 60; i++) {
      try {
        const res = await axios.get(`${this.cfg.mail}?action=message&email=${email}`);
        const msg = res?.data?.data?.[0]?.text_content || "";
        const otpMatch = msg.match(/\b\d{6}\b/);
        if (otpMatch) return otpMatch[0];
      } catch (e) {}
      await this.slp(3e3);
    }
    throw new Error("OTP Polling Timeout");
  }
  async reg(appId) {
    try {
      console.log("[Process] Initializing new account...");
      const mailRes = await axios.get(`${this.cfg.mail}?action=create`);
      const email = mailRes?.data?.email;
      if (!email) throw new Error("Email creation failed");
      const password = this.rndPw();
      const headers = {
        ...this.cfg.hdrs,
        "x-app": appId
      };
      const codeRes = await axios.post(`${this.cfg.api}/users/code`, {
        user_email: email
      }, {
        headers: headers
      });
      const encryptedInfo = codeRes?.data?.result?.encryptedInfo;
      const otp = await this.pollOtp(email);
      await axios.post(`${this.cfg.api}/users/register`, {
        user_email: email,
        password: password,
        code: otp,
        encryptedInfo: encryptedInfo
      }, {
        headers: headers
      });
      const loginRes = await axios.post(`${this.cfg.api}/users/login`, {
        user_email: email,
        password: password
      }, {
        headers: headers
      });
      return loginRes?.data?.result?.token || null;
    } catch (e) {
      throw new Error(`Registration Failed: ${e.message}`);
    }
  }
  async up(token, mode, buf, appId, prompt) {
    try {
      console.log(`[Process] Generating via AI Mode: ${mode}`);
      const form = new FormData();
      form.append("file0", buf, {
        filename: "image.png",
        contentType: "image/png"
      });
      if (prompt) {
        form.append("options", JSON.stringify({
          prompt: prompt
        }));
      }
      const res = await axios.post(`${this.cfg.api}/generate/${mode}`, form, {
        headers: {
          ...this.cfg.hdrs,
          ...form.getHeaders(),
          authorization: `Bearer ${token}`,
          "x-app": appId
        }
      });
      return res?.data?.result || null;
    } catch (e) {
      throw new Error(`Generation API Error: ${e.response?.data?.message || e.message}`);
    }
  }
  async generate({
    token = "auto",
    mode = "colorize",
    imageUrl,
    prompt,
    ...rest
  }) {
    try {
      console.log("[Process] Starting Magickimg workflow...");
      const appId = this.genAppId();
      const buf = await this.getBuf(imageUrl);
      let activeToken = token === "auto" || !token ? await this.reg(appId) : token;
      if (!activeToken) throw new Error("Token verification failed");
      const resultUrl = await this.up(activeToken, mode, buf, appId, prompt);
      if (!resultUrl) throw new Error("API result is empty");
      console.log("[Process] Success!");
      return {
        result: resultUrl,
        token: activeToken,
        mode: mode,
        appId: appId,
        prompt: prompt || null
      };
    } catch (e) {
      console.error("[Error]", e.message);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new ImageColorizer();
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