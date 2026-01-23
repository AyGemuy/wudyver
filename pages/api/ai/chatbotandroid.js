import axios from "axios";
import crypto from "crypto";
class AiChat {
  constructor() {
    this.base = "https://us-central1-chatbotandroid-3894d.cloudfunctions.net";
    this.msgs = [];
  }
  enc() {
    try {
      console.log("[enc] start");
      const ts = Math.floor(Date.now() / 1e3);
      const plain = `random${ts}`;
      const key = "0909788674763528";
      const salt = Buffer.from("dontbesmartSalt!", "utf8");
      const derivedKey = crypto.pbkdf2Sync(key, salt, 1e3, 32, "sha256");
      const iv = Buffer.from("ivfalaterroroayk", "utf8");
      const cipher = crypto.createCipheriv("aes-256-cbc", derivedKey, iv);
      let enc = cipher.update(plain, "utf8", "base64");
      enc += cipher.final("base64");
      console.log("[enc] done");
      return enc;
    } catch (e) {
      console.log("[enc] error:", e);
      throw e;
    }
  }
  async sol(img) {
    try {
      if (Buffer.isBuffer(img)) return img.toString("base64");
      if (/^data:image/.test(img)) return img.split(",")[1] || img;
      if (/^https?:\/\//.test(img)) {
        console.log("[sol] fetch url");
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data).toString("base64");
      }
      return img;
    } catch (e) {
      console.log("[sol] error:", e?.message || e);
      throw e;
    }
  }
  async chat({
    prompt,
    messages,
    image,
    ...rest
  }) {
    try {
      console.log("[generate] start");
      const auth = `Bearer ${this.enc().trim()}`;
      const content = [{
        type: "text",
        text: prompt
      }];
      if (image) {
        const list = Array.isArray(image) ? image : [image];
        for (const img of list) {
          const b64 = await this.sol(img);
          content.push({
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${b64}`
            }
          });
        }
      }
      const userMsg = {
        role: "user",
        content: content
      };
      this.msgs.push(userMsg);
      const payload = messages || this.msgs;
      const {
        data
      } = await axios.post(`${this.base}/AiAssistant`, {
        prompt: payload
      }, {
        headers: {
          authorization: auth,
          "Content-Type": "application/json",
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip"
        }
      });
      const assistantMsg = {
        role: "assistant",
        content: [{
          type: "text",
          text: data?.response || data || ""
        }]
      };
      this.msgs.push(assistantMsg);
      console.log("[generate] done");
      return {
        result: data,
        history: this.msgs
      };
    } catch (e) {
      console.log("[generate] error:", e?.response?.data || e?.message || e);
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
  const api = new AiChat();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}