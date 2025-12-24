import axios from "axios";
import CryptoJS from "crypto-js";
import PROMPT from "@/configs/ai-prompt";
class AIEnhancer {
  constructor() {
    this.key = "ai-enhancer-web__aes-key";
    this.iv = "aienhancer-aesiv";
    this.api = "https://aienhancer.ai/api/v1/r/image-enhance";
    this.model = {
      5: "seedream",
      2: "nano",
      8: "flux",
      9: "qwen"
    };
    this.h = {
      "content-type": "application/json",
      origin: "https://aienhancer.ai",
      referer: "https://aienhancer.ai/ai-image-editor",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  e(d) {
    const k = CryptoJS.enc.Utf8.parse(this.key);
    const i = CryptoJS.enc.Utf8.parse(this.iv);
    const s = typeof d === "string" ? d : JSON.stringify(d);
    return CryptoJS.AES.encrypt(s, k, {
      iv: i,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  }
  async s(i) {
    if (!i) return "";
    try {
      if (Buffer.isBuffer(i)) return `data:image/jpeg;base64,${i.toString("base64")}`;
      if (typeof i === "string" && i.startsWith("http")) {
        const res = await axios.get(i, {
          responseType: "arraybuffer"
        });
        return `data:${res.headers["content-type"] || "image/jpeg"};base64,${Buffer.from(res.data).toString("base64")}`;
      }
      return i.includes("base64,") ? i : `data:image/jpeg;base64,${i}`;
    } catch (err) {
      console.log(`[Log] Image resolve error: ${err.message}`);
      return "";
    }
  }
  v(m) {
    const id = Object.keys(this.model).find(k => this.model[k] === String(m).toLowerCase()) || (this.model[m] ? m : 5);
    return parseInt(id);
  }
  w(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      const mId = this.v(rest?.model || 2);
      const mName = this.model[mId] || "unknown";
      console.log(`[Process] Model: ${mName} (${mId}) | Prompt: ${prompt?.slice(0, 20)}...`);
      const img = await this.s(imageUrl);
      const set = {
        size: rest?.size || "2K",
        aspect_ratio: rest?.aspect_ratio || "match_input_image",
        output_format: rest?.output_format || "png",
        sequential_image_generation: rest?.sequential_image_generation || "disabled",
        max_images: rest?.max_images || 1,
        prompt: prompt || PROMPT.text || "High quality enhancement",
        ...rest
      };
      console.log(`[Process] Creating task...`);
      const {
        data: res1
      } = await axios.post(`${this.api}/create`, {
        model: mId,
        image: img,
        settings: this.e(set)
      }, {
        headers: this.h
      });
      const tid = res1?.data?.id || null;
      if (!tid) throw new Error(res1?.message || "Task ID failed");
      console.log(`[Process] Task ID: ${tid}. Polling...`);
      let final = null;
      while (!final) {
        const {
          data: res2
        } = await axios.post(`${this.api}/result`, {
          task_id: tid
        }, {
          headers: this.h
        });
        const stat = res2?.data?.status || "processing";
        if (stat === "succeeded") {
          final = res2.data;
          console.log(`[Process] Success!`);
        } else if (stat === "failed" || res2?.data?.error) {
          throw new Error(res2?.data?.error || "Server error");
        } else {
          await this.w(3e3);
        }
      }
      return final;
    } catch (e) {
      console.error(`[Error] ${e?.message}`);
      return {
        error: true,
        msg: e?.message || "Internal Error"
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
  const api = new AIEnhancer();
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