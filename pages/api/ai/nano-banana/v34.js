import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class NanoBananaStudio {
  constructor(token = null) {
    this.supabaseUrl = "https://enuuzhtsnzwocqccfjwe.supabase.co/auth/v1";
    this.apiUrl = "https://nanobananastudio.com/api/edit";
    this.mailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVudXV6aHRzbnp3b2NxY2NmandlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDQ1NTYsImV4cCI6MjA3ODUyMDU1Nn0.igh206G4Zw1yKImgPs9fraYp_b1bSFguYd6_gs6Swt4";
    this.token = token;
  }
  async createMail() {
    console.log("[Mail] Creating temp email...");
    try {
      const {
        data
      } = await axios.get(this.mailUrl, {
        params: {
          action: "create"
        }
      });
      console.log("[Mail] Email:", data?.email || "N/A");
      return data?.email || null;
    } catch (err) {
      console.error("[Mail] Error:", err?.message || err);
      throw err;
    }
  }
  async checkMail(email) {
    try {
      const {
        data
      } = await axios.get(this.mailUrl, {
        params: {
          action: "message",
          email: email
        }
      });
      return data?.data || [];
    } catch (err) {
      console.error("[Mail] Check error:", err?.message || err);
      return [];
    }
  }
  async waitVerifyLink(email, maxAttempts = 30, delay = 3e3) {
    console.log("[Mail] Waiting for verify link...");
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const msgs = await this.checkMail(email);
        console.log(`[Mail] Attempt ${i + 1}/${maxAttempts} - Messages: ${msgs?.length || 0}`);
        for (const msg of msgs) {
          const content = msg?.text_content || "";
          const match = content.match(/https:\/\/[^\s)]+verify[^\s)]+/);
          if (match) {
            console.log("[Mail] Verify link found!");
            return match[0];
          }
        }
        await new Promise(r => setTimeout(r, delay));
      } catch (err) {
        console.error("[Mail] Wait error:", err?.message || err);
      }
    }
    throw new Error("Verify link not found");
  }
  async signup(email) {
    console.log("[Signup] Registering:", email);
    try {
      const {
        data
      } = await axios.post(`${this.supabaseUrl}/signup`, {
        email: email,
        password: email,
        data: {},
        gotrue_meta_security: {},
        code_challenge: null,
        code_challenge_method: null
      }, {
        headers: {
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "x-client-info": "supabase-js-web/2.81.1",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      console.log("[Signup] Success");
      return data;
    } catch (err) {
      console.error("[Signup] Error:", err?.response?.data || err?.message || err);
      throw err;
    }
  }
  async verify(verifyUrl) {
    console.log("[Verify] Confirming email...");
    try {
      await axios.get(verifyUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        maxRedirects: 0,
        validateStatus: s => s < 400
      });
      console.log("[Verify] Success");
      return true;
    } catch (err) {
      if (err?.response?.status === 302 || err?.response?.status === 301) {
        console.log("[Verify] Redirect OK");
        return true;
      }
      console.error("[Verify] Error:", err?.message || err);
      throw err;
    }
  }
  async login(email) {
    console.log("[Login] Authenticating:", email);
    try {
      const {
        data
      } = await axios.post(`${this.supabaseUrl}/token?grant_type=password`, {
        email: email,
        password: email,
        gotrue_meta_security: {}
      }, {
        headers: {
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "x-client-info": "supabase-js-web/2.81.1",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      this.token = data?.access_token || null;
      console.log("[Login] Token:", this.token ? "OK" : "FAIL");
      return data;
    } catch (err) {
      console.error("[Login] Error:", err?.response?.data || err?.message || err);
      throw err;
    }
  }
  async auth() {
    console.log("[Auth] Starting auto authentication...");
    try {
      const email = await this.createMail();
      if (!email) throw new Error("Failed to create email");
      await this.signup(email);
      const verifyUrl = await this.waitVerifyLink(email);
      await this.verify(verifyUrl);
      await this.login(email);
      console.log("[Auth] Complete!");
      return this.token;
    } catch (err) {
      console.error("[Auth] Error:", err?.message || err);
      throw err;
    }
  }
  async toBase64(input) {
    if (!input) return null;
    if (typeof input === "string" && input.startsWith("data:")) return input;
    if (typeof input === "string" && input.startsWith("http")) {
      console.log("[Base64] Downloading from URL...");
      const {
        data
      } = await axios.get(input, {
        responseType: "arraybuffer"
      });
      const b64 = Buffer.from(data).toString("base64");
      return `data:image/jpeg;base64,${b64}`;
    }
    if (Buffer.isBuffer(input)) {
      return `data:image/jpeg;base64,${input.toString("base64")}`;
    }
    return input;
  }
  async generate({
    token,
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("[Generate] Prompt:", prompt);
    console.log("[Generate] Mode:", imageUrl ? "image-editing" : "text-to-image");
    try {
      const useToken = token || this.token;
      if (!useToken) {
        console.log("[Generate] No token, authenticating...");
        await this.auth();
      } else if (token) {
        console.log("[Generate] Using provided token");
        this.token = token;
      }
      const payload = {
        prompt: prompt || "",
        style: rest?.style || "",
        mode: imageUrl ? "image-editing" : "text-to-image",
        ...rest
      };
      if (imageUrl) {
        const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        console.log("[Generate] Processing images:", urls.length);
        for (const url of urls) {
          const b64 = await this.toBase64(url);
          payload.image = b64;
          console.log("[Generate] Image converted:", b64 ? "OK" : "FAIL");
        }
      }
      console.log("[Generate] Sending request...");
      const {
        data
      } = await axios.post(this.apiUrl, payload, {
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          origin: "https://nanobananastudio.com",
          referer: "https://nanobananastudio.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("[Generate] Success");
      return {
        ...data,
        token: this.token
      };
    } catch (err) {
      if (err?.response?.status === 401) {
        console.log("[Generate] Token expired, re-authenticating...");
        await this.auth();
        return this.generate({
          prompt: prompt,
          imageUrl: imageUrl,
          ...rest
        });
      }
      console.error("[Generate] Error:", err?.response?.data || err?.message || err);
      throw err;
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
  const api = new NanoBananaStudio();
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