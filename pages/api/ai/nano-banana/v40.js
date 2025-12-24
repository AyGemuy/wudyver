import axios from "axios";
import CryptoJS from "crypto-js";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class AiNanaBanana {
  constructor() {
    this.base = "https://api.ainanabanana.com/api";
    this.mailBase = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.token = null;
    this.email = null;
    this.key = CryptoJS.enc.Utf8.parse("1234567890123456");
    this.ax = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://ainanabanana.com",
        referer: "https://ainanabanana.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  parse(v) {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  decrypt(data) {
    try {
      const bytes = CryptoJS.AES.decrypt(data, this.key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });
      const text = bytes.toString(CryptoJS.enc.Utf8);
      console.log(text);
      return this.parse(text);
    } catch (e) {
      console.log("❌ Decrypt error:", e.message);
      return null;
    }
  }
  async createMail() {
    try {
      console.log("📧 Creating email...");
      const {
        data
      } = await this.ax.get(`${this.mailBase}?action=create`);
      this.email = data?.email;
      console.log("✅ Email created:", this.email);
      return this.email;
    } catch (e) {
      console.log("❌ Create mail error:", e.message);
      throw e;
    }
  }
  async pollOtp(max = 60, delay = 3e3) {
    try {
      console.log("🔍 Polling OTP...");
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, delay));
        const {
          data
        } = await this.ax.get(`${this.mailBase}?action=message&email=${this.email}`);
        const msg = data?.data?.[0]?.text_content;
        if (msg) {
          const match = msg.match(/\b\d{6}\b/);
          if (match) {
            console.log("✅ OTP found:", match[0]);
            return match[0];
          }
        }
        console.log(`⏳ Attempt ${i + 1}/${max}...`);
      }
      throw new Error("OTP timeout");
    } catch (e) {
      console.log("❌ Poll OTP error:", e.message);
      throw e;
    }
  }
  async sendCode() {
    try {
      console.log("📤 Sending code...");
      await this.ax.post(`${this.base}/register/sendCode?email=${this.email}`, null, {
        headers: {
          authorization: ""
        }
      });
      console.log("✅ Code sent");
    } catch (e) {
      console.log("❌ Send code error:", e.message);
      throw e;
    }
  }
  async register(code) {
    try {
      console.log("📝 Registering...");
      const {
        data
      } = await this.ax.post(`${this.base}/register/email`, {
        email: this.email,
        code: code
      }, {
        headers: {
          authorization: "",
          "content-type": "application/json"
        }
      });
      const decrypted = this.decrypt(data?.data);
      this.token = decrypted?.token;
      console.log("✅ Registered, token:", this.token?.slice(0, 20) + "...");
      return this.token;
    } catch (e) {
      console.log("❌ Register error:", e.message);
      throw e;
    }
  }
  async auth() {
    try {
      await this.createMail();
      await this.sendCode();
      const otp = await this.pollOtp();
      await this.register(otp);
      return this.token;
    } catch (e) {
      console.log("❌ Auth error:", e.message);
      throw e;
    }
  }
  async upload(input) {
    try {
      console.log("📤 Uploading image...");
      const form = new FormData();
      if (Buffer.isBuffer(input)) {
        form.append("file", input, "image.jpg");
      } else if (input?.startsWith?.("http")) {
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        form.append("file", Buffer.from(data), "image.jpg");
      } else if (input?.startsWith?.("data:")) {
        const b64 = input.split(",")[1] || input;
        const buf = Buffer.from(b64, "base64");
        form.append("file", buf, "image.jpg");
      }
      const {
        data
      } = await this.ax.post(`${this.base}/image/upload`, form, {
        headers: {
          ...form.getHeaders(),
          authorization: this.token
        }
      });
      const url = this.decrypt(data?.data);
      console.log("✅ Uploaded:", url);
      return url;
    } catch (e) {
      console.log("❌ Upload error:", e.message);
      throw e;
    }
  }
  async create(prompt, urls = [], model = "nano-banana-pro", resolution = "1K", numImages = 1) {
    try {
      console.log("🎨 Creating task...");
      const body = {
        prompt: prompt,
        model: model,
        resolution: resolution,
        numImages: numImages
      };
      if (urls?.length) body.filesUrl = urls;
      const {
        data
      } = await this.ax.post(`${this.base}/image/generator`, body, {
        headers: {
          authorization: this.token,
          "content-type": "application/json"
        }
      });
      const task = this.decrypt(data?.data);
      console.log("✅ Task created:", task?.id);
      return task;
    } catch (e) {
      console.log("❌ Create error:", e.message);
      throw e;
    }
  }
  async check(id) {
    try {
      const {
        data
      } = await this.ax.get(`${this.base}/image/info?id=${id}`, {
        headers: {
          authorization: this.token
        }
      });
      const decrypted = this.decrypt(data?.data);
      if (decrypted?.filesUrl) decrypted.filesUrl = this.parse(decrypted.filesUrl);
      if (decrypted?.responseJson) decrypted.responseJson = this.parse(decrypted.responseJson);
      return decrypted;
    } catch (e) {
      console.log("❌ Check error:", e.message);
      throw e;
    }
  }
  async poll(id, max = 60, delay = 3e3) {
    try {
      console.log("⏳ Polling result...");
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, delay));
        const info = await this.check(id);
        console.log(`🔄 Status: ${info?.genStatus} (${i + 1}/${max})`);
        if (info?.genStatus === 1) {
          console.log("✅ Complete:", info?.resultUrl);
          return info;
        }
      }
      throw new Error("Task timeout");
    } catch (e) {
      console.log("❌ Poll error:", e.message);
      throw e;
    }
  }
  async generate({
    token,
    prompt,
    imageUrl,
    model = "nano-banana-pro",
    resolution = "1K",
    numImages = 1,
    ...rest
  }) {
    try {
      if (token) {
        this.token = token;
        console.log("🔑 Token set:", token?.slice(0, 20) + "...");
      }
      if (!this.token) {
        console.log("🔐 Auto auth...");
        await this.auth();
      }
      const urls = [];
      if (imageUrl) {
        const imgs = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const img of imgs) {
          const url = await this.upload(img);
          urls.push(url);
        }
      }
      const task = await this.create(prompt, urls.length ? urls : undefined, model, resolution, numImages);
      const result = await this.poll(task?.id);
      return {
        ...result,
        token: this.token
      };
    } catch (e) {
      console.log("❌ Generate error:", e.message);
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
  const api = new AiNanaBanana();
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