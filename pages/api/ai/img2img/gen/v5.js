import axios from "axios";
import OSS from "ali-oss";
import PROMPT from "@/configs/ai-prompt";
class NoteGPT {
  constructor() {
    this.baseURL = "https://notegpt.io";
    this.stsToken = null;
    this.anonId = this.genAnonId();
    console.log("🔧 NoteGPT ready, anon id:", this.anonId);
  }
  genAnonId() {
    const hex = () => Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
    return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
  }
  getCookie() {
    return `anonymous_user_id=${this.anonId};`;
  }
  getHeaders() {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      cookie: this.getCookie(),
      origin: this.baseURL,
      referer: `${this.baseURL}/ai-image-editor?s=$`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async getSTSToken() {
    try {
      console.log("🔑 Mendapatkan STS Token...");
      const {
        data
      } = await axios.get(`${this.baseURL}/api/v1/oss/sts-token`, {
        headers: this.getHeaders()
      });
      const token = data?.data;
      if (!token?.AccessKeyId) throw new Error("Token STS tidak valid dari respons API: " + JSON.stringify(data));
      this.stsToken = token;
      console.log("✅ STS Token diperoleh");
      return token;
    } catch (e) {
      console.error("❌ Kesalahan STS Token:", e.message);
      throw e;
    }
  }
  async uploadImage(input) {
    try {
      if (!this.stsToken || new Date(this.stsToken.Expiration) < new Date()) {
        console.log("Token STS tidak ada atau kedaluwarsa. Memperoleh yang baru.");
        await this.getSTSToken();
      }
      const store = new OSS({
        accessKeyId: this.stsToken.AccessKeyId,
        accessKeySecret: this.stsToken.AccessKeySecret,
        stsToken: this.stsToken.SecurityToken,
        bucket: "nc-cdn",
        endpoint: "oss-us-west-1.aliyuncs.com",
        secure: true
      });
      const objectName = `notegpt/web3in1/${Date.now()}-${Math.random().toString(36).slice(2)}.jpeg`;
      let buf, contentType = "image/jpeg";
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res.data);
        contentType = res.headers["content-type"] || contentType;
      } else if (typeof input === "string" && input.startsWith("data:")) {
        const parts = input.split(",");
        const meta = parts[0].split(":")[1].split(";")[0];
        contentType = meta || contentType;
        buf = Buffer.from(parts[1], "base64");
      } else {
        buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
      }
      const result = await store.put(objectName, buf, {
        headers: {
          "Content-Type": contentType
        }
      });
      const cdnUrl = `https://cdn.notegpt.io/${result.name}`;
      console.log("📤 Diunggah melalui ali-oss .put():", cdnUrl);
      return cdnUrl;
    } catch (e) {
      const errorMessage = e.response ? JSON.stringify(e.response.data) : e.message;
      console.error("❌ Kesalahan unggah:", errorMessage, e);
      throw e;
    }
  }
  async createTask({
    prompt,
    imageUrl,
    sub_type,
    ...opt
  }) {
    try {
      let uploadedUrl = null;
      if (imageUrl) {
        uploadedUrl = await this.uploadImage(Array.isArray(imageUrl) ? imageUrl[0] : imageUrl);
      }
      const payload = {
        image_url: uploadedUrl,
        type: 60,
        user_prompt: prompt || PROMPT.text,
        sub_type: sub_type,
        aspect_ratio: opt.aspect_ratio || "match_input_image",
        num: opt.num || 1,
        model: opt.model || ""
      };
      const {
        data
      } = await axios.post(`${this.baseURL}/api/v2/images/handle`, payload, {
        headers: {
          ...this.getHeaders(),
          "content-type": "application/json; charset=UTF-8"
        }
      });
      const sid = data?.data?.session_id;
      if (!sid) {
        console.error("Kesalahan respons pembuatan tugas:", data);
        throw new Error("Tidak ada session id yang dikembalikan dari server.");
      }
      console.log("🆔 Tugas dibuat:", sid);
      return sid;
    } catch (e) {
      const errorMessage = e.response ? JSON.stringify(e.response.data) : e.message;
      console.error("❌ Kesalahan pembuatan tugas:", errorMessage, e);
      throw e;
    }
  }
  async pollTask(sid, ms = 3e3) {
    console.log("🔄 Polling:", sid);
    const end = Date.now() + 12e4;
    while (Date.now() < end) {
      try {
        const {
          data
        } = await axios.get(`${this.baseURL}/api/v2/images/status?session_id=${sid}`, {
          headers: this.getHeaders()
        });
        const s = data?.data?.status;
        if (s === "succeeded") {
          const urls = data?.data?.results || [];
          console.log("✅ Selesai:", urls);
          return urls;
        } else if (s === "failed") {
          console.error("Respons generasi gagal:", data);
          throw new Error("Generasi gagal di server.");
        }
        console.log("⏳ Status:", s);
        await new Promise(r => setTimeout(r, ms));
      } catch (e) {
        console.warn("⚠️ Kesalahan poll:", e.message);
        await new Promise(r => setTimeout(r, ms));
      }
    }
    throw new Error("Timeout saat polling untuk hasil tugas.");
  }
  async getRemainingTimes(sub_type) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/api/v2/images/left-times?type=60&sub_type=${sub_type}`, {
        headers: this.getHeaders()
      });
      const n = data?.data?.times_left ?? 0;
      console.log("🧮 Sisa percobaan:", n);
      return n;
    } catch (e) {
      console.error("❌ Pemeriksaan sisa percobaan gagal:", e.message);
      return 0;
    }
  }
  async generate({
    prompt,
    imageUrl,
    sub_type = 3,
    ...rest
  }) {
    console.log("🚀 Memulai generasi...");
    if (sub_type === undefined) {
      throw new Error("Paramenter 'sub_type' diperlukan.");
    }
    console.log(`ℹ️ Menggunakan sub_type: ${sub_type}`);
    const t = await this.getRemainingTimes(sub_type);
    if (t <= 0) throw new Error("Sisa percobaan habis.");
    const sid = await this.createTask({
      prompt: prompt,
      imageUrl: imageUrl,
      sub_type: sub_type,
      ...rest
    });
    const res = await this.pollTask(sid);
    return res;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new NoteGPT();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}