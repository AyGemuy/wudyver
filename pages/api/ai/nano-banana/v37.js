import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
class Aina {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://ainanobanana.org",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://ainanobanana.org",
        referer: "https://ainanobanana.org/image-generator",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        priority: "u=1, i"
      }
    }));
    this.wudy = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
    });
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  async to64(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string" && input.startsWith("http")) {
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data).toString("base64");
      }
      return input.replace(/^data:image\/\w+;base64,/, "");
    } catch (e) {
      this.log("Gagal konversi gambar", "ERR");
      return null;
    }
  }
  async createMail() {
    try {
      const {
        data
      } = await this.wudy.get("", {
        params: {
          action: "create"
        }
      });
      return data?.email || null;
    } catch (e) {
      return null;
    }
  }
  async checkOtp(email) {
    this.log(`Menunggu OTP untuk ${email}...`);
    const max = 60;
    for (let i = 0; i < max; i++) {
      try {
        const {
          data
        } = await this.wudy.get("", {
          params: {
            action: "message",
            email: email
          }
        });
        const list = data?.data || [];
        for (const item of list) {
          const txt = item.text_content || item.subject || "";
          const code = txt.match(/\b\d{6}\b/)?.[0];
          if (code && (txt.includes("Nano Banana") || txt.includes("verification"))) {
            return code;
          }
        }
      } catch {}
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("OTP Timeout");
  }
  async csrf() {
    try {
      const {
        data
      } = await this.client.get("/api/auth/csrf");
      return data?.csrfToken;
    } catch {
      return "";
    }
  }
  async login() {
    try {
      this.log("Memulai proses login...");
      const email = await this.createMail();
      if (!email) throw new Error("Gagal generate email");
      this.log(`Email: ${email}`);
      const csrfToken = await this.csrf();
      await this.client.post("/api/auth/send-code", {
        email: email
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      const code = await this.checkOtp(email);
      this.log(`OTP: ${code}`);
      const params = new URLSearchParams({
        email: email,
        code: code,
        redirect: "false",
        csrfToken: csrfToken,
        callbackUrl: "https://ainanobanana.org/image-generator"
      });
      await this.client.post("/api/auth/callback/email-code?", params, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const {
        data
      } = await this.client.get("/api/auth/session");
      const user = data?.user?.email;
      if (user) {
        this.log(`Login berhasil: ${user}`);
        return true;
      }
      return false;
    } catch (e) {
      this.log(`Login gagal: ${e.message}`, "ERR");
      return false;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    const responses = [];
    const cookies = await this.jar.getCookies("https://ainanobanana.org");
    if (!cookies.some(x => x.key.includes("session-token"))) {
      if (!await this.login()) return {
        status: false,
        msg: "Auth failed"
      };
    }
    const inputs = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [null];
    this.log(`Memproses ${inputs.length} request...`);
    for (const inputImg of inputs) {
      try {
        const isImg = !!inputImg;
        const b64 = await this.to64(inputImg);
        const payload = {
          prompt: prompt || "art",
          mode: isImg ? "image-to-image" : "text-to-image",
          image: isImg ? b64 : null,
          aspectRatio: "square",
          ...rest
        };
        this.log(`Generating [${payload.mode}]...`);
        const {
          data
        } = await this.client.post("/api/demo/gen-image-grok", payload);
        if (data?.code === 0 && data?.data) {
          const res = Array.isArray(data.data) ? data.data : [data.data];
          responses.push(...res);
          this.log(`Sukses generate item.`);
        } else {
          this.log(`Gagal generate: ${data?.message}`, "WARN");
        }
      } catch (e) {
        this.log(`Error request: ${e.message}`, "ERR");
      }
    }
    return {
      success: responses.length > 0,
      total: responses.length,
      data: responses
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Aina();
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