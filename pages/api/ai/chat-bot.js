import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class AIGenerator {
  constructor() {
    this.chatId = Date.now().toString();
    this.token = this.genToken();
    this.apiKey = "dGhlb25saW5lY29udmVydGVyYXBpX2tleQ==";
    this.ax = axios.create({
      headers: {
        "User-Agent": "okhttp/5.1.0",
        "Accept-Encoding": "gzip"
      }
    });
  }
  genToken() {
    const rnd = crypto.randomBytes(8).toString("hex");
    return `${rnd}:APA91b${crypto.randomBytes(64).toString("base64").slice(0, 130)}`;
  }
  log(msg, data) {
    console.log(`[${new Date().toISOString()}] ${msg}`, data || "");
  }
  isBuf(val) {
    return Buffer.isBuffer(val);
  }
  isB64(val) {
    return typeof val === "string" && /^data:image\/[a-z]+;base64,/.test(val);
  }
  isUrl(val) {
    return typeof val === "string" && /^https?:\/\//.test(val);
  }
  async upImg(img) {
    try {
      this.log("Uploading image...");
      const fd = new FormData();
      fd.append("chatid", this.chatId);
      if (this.isBuf(img)) {
        fd.append("image", img, {
          filename: `img_${Date.now()}.png`,
          contentType: "image/*"
        });
      } else if (this.isB64(img)) {
        const buf = Buffer.from(img.split(",")[1], "base64");
        fd.append("image", buf, {
          filename: `img_${Date.now()}.png`,
          contentType: "image/*"
        });
      } else if (this.isUrl(img)) {
        const {
          data
        } = await this.ax.get(img, {
          responseType: "arraybuffer"
        });
        fd.append("image", Buffer.from(data), {
          filename: `img_${Date.now()}.png`,
          contentType: "image/*"
        });
      }
      const {
        data
      } = await this.ax.post("https://backup.asadahsan.com/api/image_upload", fd, {
        headers: fd.getHeaders()
      });
      this.log("Image uploaded:", data?.path);
      return {
        result: data?.path,
        ...data
      };
    } catch (e) {
      this.log("Upload error:", e.message);
      throw e;
    }
  }
  async chat(msgs) {
    try {
      this.log("Sending chat request...");
      const {
        data
      } = await this.ax.post("https://us-central1-ai-chat-bot-bf47e.cloudfunctions.net/chat_function_android", {
        data: {
          messages: msgs,
          model: "gpt-4o-mini"
        }
      }, {
        headers: {
          "Content-Type": "application/json",
          "firebase-instance-id-token": this.token
        }
      });
      const choice = data?.result?.choices?.[0] || {};
      const txt = choice?.message?.content || "";
      this.log("Chat response received");
      return {
        result: txt,
        id: data?.result?.id,
        created: data?.result?.created,
        model: data?.result?.object,
        finish_reason: choice?.finish_reason,
        usage: data?.result?.usage || {}
      };
    } catch (e) {
      this.log("Chat error:", e.message);
      throw e;
    }
  }
  async genImg(prm, opts = {}) {
    try {
      this.log("Creating image task...");
      const fd = new FormData();
      fd.append("api_key", this.apiKey);
      fd.append("prompt", prm);
      fd.append("seed", opts.seed || 0);
      fd.append("width", opts.width || 512);
      fd.append("height", opts.height || 512);
      fd.append("scheduler", opts.scheduler || "K_EULER");
      fd.append("num_outputs", opts.num_outputs || 1);
      fd.append("guidance_scale", opts.guidance_scale || 0);
      fd.append("negative_prompt", opts.negative_prompt || "worst quality, low quality");
      fd.append("num_inference_steps", opts.num_inference_steps || 4);
      const {
        data
      } = await this.ax.post("https://theonlineconverter.com/api/text-to-image", fd, {
        headers: fd.getHeaders()
      });
      const pid = data?.process_id;
      if (!pid) throw new Error("No process_id");
      this.log("Task created:", pid);
      const pollRes = await this.poll(pid);
      return {
        ...pollRes,
        process_id: pid,
        message: data?.message
      };
    } catch (e) {
      this.log("Image gen error:", e.message);
      throw e;
    }
  }
  async poll(pid) {
    const max = 60;
    let cnt = 0;
    while (cnt < max) {
      try {
        this.log(`Polling ${cnt + 1}/${max}...`);
        const fd = new FormData();
        fd.append("api_key", this.apiKey);
        fd.append("process_id", pid);
        const {
          data
        } = await this.ax.post("https://theonlineconverter.com/api/check/process", fd, {
          headers: fd.getHeaders()
        });
        if (data?.file_url) {
          this.log("Image ready:", data.file_url);
          return {
            result: data.file_url,
            file_size: data?.file_size,
            status: data?.status
          };
        }
        await new Promise(r => setTimeout(r, 3e3));
        cnt++;
      } catch (e) {
        this.log("Poll error:", e.message);
        await new Promise(r => setTimeout(r, 3e3));
        cnt++;
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    mode = "chat",
    prompt,
    messages = [],
    image,
    ...rest
  }) {
    try {
      this.log(`Mode: ${mode}`);
      if (mode === "image") {
        const imgRes = await this.genImg(prompt, rest);
        return {
          result: imgRes.result,
          file_size: imgRes.file_size,
          process_id: imgRes.process_id,
          messages: []
        };
      }
      let msgs = [...messages];
      const imgs = Array.isArray(image) ? image : image ? [image] : [];
      const content = [{
        type: "text",
        text: prompt || ""
      }];
      if (imgs.length > 0) {
        for (const img of imgs) {
          const upRes = await this.upImg(img);
          content.push({
            type: "image_url",
            image_url: {
              url: upRes.result
            }
          });
        }
        msgs.push({
          role: "user",
          content: content
        });
      } else if (prompt) {
        msgs.push({
          role: "user",
          content: prompt
        });
      }
      const chatRes = await this.chat(msgs);
      msgs.push({
        role: "assistant",
        content: chatRes.result
      });
      return {
        result: chatRes.result,
        messages: msgs,
        id: chatRes.id,
        created: chatRes.created,
        model: chatRes.model,
        finish_reason: chatRes.finish_reason,
        usage: chatRes.usage
      };
    } catch (e) {
      this.log("Generate error:", e.message);
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
  const api = new AIGenerator();
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