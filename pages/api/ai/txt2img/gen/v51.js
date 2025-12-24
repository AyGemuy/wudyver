import axios from "axios";
import CryptoJS from "crypto-js";
import crypto from "crypto";
class CryptoAPI {
  constructor() {
    this.base = "https://api.vidsme.com";
    this.app = "art-generator";
    this.salt = "NHGNy5YFz7HeFb";
    this.pubKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH
W5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr
rnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s
snOjvdDb4wiZI8x3UwIDAQAB
-----END PUBLIC KEY-----`;
    this.uid = this.getUid();
    this.pollInterval = 3e3;
    this.pollMax = 60;
    this.cfg = {
      styles: [{
        type: "Anime",
        api: "anime"
      }, {
        type: "Realistic",
        api: "realistic"
      }, {
        type: "Hentai",
        api: "hentai"
      }, {
        type: "Hassaku",
        api: "hassaku(hentai)"
      }],
      ratios: [{
        name: "1:1",
        w: "512",
        h: "512"
      }, {
        name: "2:3",
        w: "512",
        h: "768"
      }, {
        name: "3:2",
        w: "768",
        h: "512"
      }]
    };
  }
  getUid() {
    const stored = global.uid || null;
    if (stored) return stored;
    const rand = CryptoJS.lib.WordArray.random(16).toString();
    const ts = Date.now();
    const hash = CryptoJS.SHA256(rand + ts).toString();
    global.uid = hash;
    return hash;
  }
  nonce() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  rand(len) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  rsaEnc(text) {
    console.log("🔐 RSA encrypting...");
    try {
      const encrypted = crypto.publicEncrypt({
        key: this.pubKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(text));
      console.log("✅ RSA encrypted");
      return encrypted.toString("base64");
    } catch (err) {
      console.error("❌ RSA encryption failed:", err?.message || err);
      throw err;
    }
  }
  enc(text, key, iv) {
    const k = CryptoJS.enc.Utf8.parse(key);
    const i = CryptoJS.enc.Utf8.parse(iv);
    const t = CryptoJS.enc.Utf8.parse(text);
    const encrypted = CryptoJS.AES.encrypt(t, k, {
      iv: i,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  }
  auth() {
    console.log("🔐 Generating auth params...");
    try {
      const ts = Math.floor(Date.now() / 1e3);
      const n = this.nonce();
      const secret = this.rand(16);
      const encrypted = this.rsaEnc(secret);
      const raw = `${this.app}:${this.salt}:${ts}:${n}:${encrypted}`;
      const sign = this.enc(raw, secret, secret);
      console.log("✅ Auth params generated");
      return {
        app_id: this.app,
        t: ts,
        nonce: n,
        sign: sign,
        secret_key: encrypted
      };
    } catch (err) {
      console.error("❌ Auth generation failed:", err?.message || err);
      throw err;
    }
  }
  async req(url, method = "GET", data = null, headers = {}) {
    console.log(`📡 ${method} ${url}`);
    try {
      const config = {
        method: method,
        url: url,
        headers: {
          accept: "application/json",
          "accept-language": "id-ID",
          origin: "https://nsfwaiartgenerator.io",
          referer: "https://nsfwaiartgenerator.io/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...headers
        }
      };
      if (data && method === "POST") {
        config.data = data;
        config.headers["content-type"] = "application/json";
      }
      const res = await axios(config);
      console.log("✅ Request success");
      console.log("📦 Response:", JSON.stringify(res?.data || res, null, 2));
      return res?.data || res;
    } catch (err) {
      console.error("❌ Request failed");
      console.error("📦 Error data:", JSON.stringify(err?.response?.data || err?.message || err, null, 2));
      throw err;
    }
  }
  async credit() {
    console.log("💰 Checking credits...");
    try {
      const auth = this.auth();
      const params = new URLSearchParams({
        user_id: this.uid,
        ...auth
      });
      const url = `${this.base}/api/texttoimg/v1/credit?${params}`;
      const result = await this.req(url);
      console.log("💰 Available credits:", result?.data || 0);
      return result?.data || 0;
    } catch (err) {
      console.error("❌ Credit check failed:", err?.message || err);
      return 0;
    }
  }
  async check(jobId) {
    console.log("🔍 Checking job:", jobId);
    try {
      const auth = this.auth();
      const params = new URLSearchParams({
        user_id: this.uid,
        job_id: jobId,
        ...auth
      });
      const url = `${this.base}/api/texttoimg/v1/task?${params}`;
      return await this.req(url);
    } catch (err) {
      console.error("❌ Job check failed:", err?.message || err);
      throw err;
    }
  }
  async poll(jobId) {
    console.log("🔄 Starting auto polling for job:", jobId);
    let attempts = 0;
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;
        console.log(`⏳ Poll attempt ${attempts}/${this.pollMax}...`);
        try {
          const result = await this.check(jobId);
          const data = result?.data || {};
          const imgUrl = data?.generate_url || data?.image_url || data?.url || null;
          if (imgUrl) {
            clearInterval(interval);
            console.log("✅ Job completed!");
            const fullUrl = imgUrl.startsWith("http") ? imgUrl : `https://art-global.yimeta.ai/${imgUrl}`;
            console.log("🖼️  Image URL:", fullUrl);
            const finalResult = {
              result: fullUrl
            };
            resolve(finalResult);
          } else if (data?.status === "failed" || data?.status === "error") {
            clearInterval(interval);
            console.error("❌ Job failed");
            reject(new Error("Job failed: " + (data?.error || "Unknown error")));
          } else if (attempts >= this.pollMax) {
            clearInterval(interval);
            console.error("⏰ Polling timeout");
            reject(new Error("Polling timeout after " + this.pollMax + " attempts"));
          } else {
            console.log("⏳ Still processing...");
          }
        } catch (err) {
          console.error("❌ Polling error:", err?.message || err);
          if (attempts >= this.pollMax) {
            clearInterval(interval);
            reject(err);
          }
        }
      }, this.pollInterval);
    });
  }
  validate(model, ratio) {
    console.log("✅ Validating params...");
    const validModel = this.cfg.styles.find(s => s.api === model || s.type.toLowerCase() === model?.toLowerCase());
    const m = validModel?.api || this.cfg.styles[0].api;
    const validRatio = this.cfg.ratios.find(r => r.name === ratio || r.w === ratio?.w && r.h === ratio?.h);
    const r = validRatio || this.cfg.ratios[0];
    console.log("📐 Model:", m, "| Ratio:", r.name, `(${r.w}x${r.h})`);
    return {
      model: m,
      width: r.w,
      height: r.h
    };
  }
  async generate({
    prompt,
    model = "anime",
    width = "",
    height = "",
    ratio = "2:3",
    negative_prompt = "",
    autoPoll = true,
    ...rest
  }) {
    console.log("🎨 Generating image...");
    console.log("📝 Prompt:", prompt);
    try {
      const validated = ratio ? this.validate(model, ratio) : this.validate(model, {
        w: width,
        h: height
      });
      console.log("⚙️  Settings:", validated);
      const auth = this.auth();
      const params = new URLSearchParams(auth);
      const url = `${this.base}/api/texttoimg/v1/task?${params}`;
      const payload = {
        prompt: prompt,
        model: validated.model,
        width: validated.width,
        height: validated.height,
        negative_prompt: negative_prompt,
        user_id: this.uid,
        ...rest
      };
      const result = await this.req(url, "POST", payload);
      const jobId = result?.data?.job_id || result?.data?.id || null;
      console.log("🎨 Generation started");
      console.log("🆔 Job ID:", jobId || "N/A");
      if (autoPoll && jobId) {
        console.log("🔄 Auto polling enabled...");
        return await this.poll(jobId);
      }
      return result;
    } catch (err) {
      console.error("❌ Generation failed:", err?.message || err);
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
  const api = new CryptoAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}