import axios from "axios";
import OSS from "ali-oss";
import PROMPT from "@/configs/ai-prompt";
class VisualGPT {
  constructor() {
    this.baseURL = "https://visualgpt.io";
    this.stsToken = null;
    this.anonId = this.genAnonId();
    console.log("🔧 VisualGPT ready, anon id:", this.anonId);
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
      referer: `${this.baseURL}/ai-image-editor`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
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
      console.log("🔑 Getting STS Token...");
      const {
        data
      } = await axios.get(`${this.baseURL}/api/v1/oss/sts-token`, {
        headers: this.getHeaders()
      });
      const token = data?.data;
      if (!token?.AccessKeyId) throw new Error("Invalid STS token from API response: " + JSON.stringify(data));
      this.stsToken = token;
      console.log("✅ STS Token obtained");
      return token;
    } catch (e) {
      console.error("❌ STS Token error:", e.message);
      throw e;
    }
  }
  async uploadImage(input) {
    try {
      if (!this.stsToken) {
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
      const objectName = `visualgpt/user-upload/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
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
      const cdnUrl = `https://cdn.visualgpt.io/${result.name}`;
      console.log("📤 Uploaded via ali-oss .put():", cdnUrl);
      return cdnUrl;
    } catch (e) {
      const errorMessage = e.response ? JSON.stringify(e.response.data) : e.message;
      console.error("❌ Upload error:", errorMessage, e);
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
      const urls = [];
      if (imageUrl) {
        const imageInputs = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const img of imageInputs) {
          const uploadedUrl = await this.uploadImage(img);
          urls.push(uploadedUrl);
        }
      }
      const payload = {
        image_urls: urls,
        type: 61,
        user_prompt: prompt || PROMPT.text,
        sub_type: sub_type,
        aspect_ratio: opt.aspect_ratio || "match_input_image",
        num: opt.num || (sub_type === 1 ? 1 : ""),
        max_images: opt.max_images || 1,
        size: opt.size || ""
      };
      const {
        data
      } = await axios.post(`${this.baseURL}/api/v1/prediction/handle`, payload, {
        headers: {
          ...this.getHeaders(),
          "content-type": "application/json; charset=UTF-8"
        }
      });
      const sid = data?.data?.session_id;
      if (!sid) {
        console.error("Create task response error:", data);
        throw new Error("No session id returned from server.");
      }
      console.log("🆔 Created:", sid);
      return sid;
    } catch (e) {
      const errorMessage = e.response ? JSON.stringify(e.response.data) : e.message;
      console.error("❌ Create task error:", errorMessage, e);
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
        } = await axios.get(`${this.baseURL}/api/v1/prediction/get-status?session_id=${sid}`, {
          headers: this.getHeaders()
        });
        const s = data?.data?.status;
        if (s === "succeeded") {
          const urls = data?.data?.results || [];
          console.log("✅ Done:", urls);
          return urls;
        } else if (s === "failed") {
          console.error("Generation failed response:", data);
          throw new Error("Generation failed on the server.");
        }
        console.log("⏳ Status:", s);
        await new Promise(r => setTimeout(r, ms));
      } catch (e) {
        console.warn("⚠️ Poll error:", e.message);
        await new Promise(r => setTimeout(r, ms));
      }
    }
    throw new Error("Timeout while polling for task result.");
  }
  async getRemainingTimes() {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/api/v1/diagram/left-times?type=60`, {
        headers: this.getHeaders()
      });
      const n = data?.data?.times_left ?? 0;
      console.log("🧮 Remaining:", n);
      return n;
    } catch (e) {
      console.error("❌ Remaining check failed:", e.message);
      return 0;
    }
  }
  async generate({
    prompt,
    imageUrl,
    sub_type,
    ...rest
  }) {
    console.log("🚀 Start generation...");
    const effective_sub_type = sub_type !== undefined ? sub_type : imageUrl ? 2 : 3;
    console.log(`ℹ️ Using sub_type: ${effective_sub_type}`);
    const t = await this.getRemainingTimes();
    if (t <= 0) throw new Error("No remaining times");
    const sid = await this.createTask({
      prompt: prompt,
      imageUrl: imageUrl,
      sub_type: effective_sub_type,
      ...rest
    });
    const res = await this.pollTask(sid);
    return res;
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
    const api = new VisualGPT();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}