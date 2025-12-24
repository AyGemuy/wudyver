import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.client = axios.create({
      baseURL: "https://image-editor.org/api",
      headers: {
        origin: "https://image-editor.org",
        referer: "https://image-editor.org/editor",
        "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
      }
    });
  }
  async bf(inp) {
    try {
      if (Buffer.isBuffer(inp)) return inp;
      if (typeof inp === "string") {
        return inp.startsWith("http") ? (await axios.get(inp, {
          responseType: "arraybuffer"
        })).data : Buffer.from(inp.startsWith("data:") ? inp.split(",")[1] : inp, "base64");
      }
      throw new Error("Invalid image format");
    } catch (e) {
      throw new Error(`Buffer conversion failed: ${e.message}`);
    }
  }
  async tk() {
    console.log("🛡️ Getting Turnstile token...");
    try {
      const u = "https://image-editor.org/editor";
      const k = "0x4AAAAAAB8ClzQTJhVDd_pU";
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token?url=${encodeURIComponent(u)}&sitekey=${k}`);
      const t = data?.token || data?.result;
      if (!t) throw new Error("Token missing");
      return t;
    } catch (e) {
      throw new Error(`Token failed: ${e.message}`);
    }
  }
  async ul(buf) {
    console.log("☁️ Uploading resource...");
    try {
      const {
        data: pre
      } = await this.client.post("/upload/presigned", {
        filename: `${Date.now()}_rynn.jpg`,
        contentType: "image/jpeg"
      });
      if (!pre?.data?.uploadUrl) throw new Error("No upload URL");
      await axios.put(pre.data.uploadUrl, buf, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      return {
        url: pre.data.fileUrl,
        id: pre.data.uploadId,
        hash: crypto.createHash("sha256").update(buf).digest("hex").substring(0, 64)
      };
    } catch (e) {
      throw new Error(`Upload failed: ${e.message}`);
    }
  }
  async wt(tid) {
    console.log(`⏳ Waiting task: ${tid}`);
    while (true) {
      const {
        data
      } = await this.client.get(`/task/${tid}`);
      const s = data?.data?.status;
      if (s === "completed") return data.data;
      if (s === "failed") throw new Error("Task failed remotely");
      await new Promise(r => setTimeout(r, 3e3));
    }
  }
  async processOne(prompt, imgInput, rest) {
    try {
      const cf = await this.tk();
      const p = prompt || "Enhance image quality";
      let payload = {
        prompt: p,
        turnstileToken: cf,
        userUUID: crypto.randomUUID(),
        ...rest
      };
      let endpoint = "/generate";
      if (imgInput) {
        endpoint = "/edit";
        console.log("🎨 Processing I2I mode...");
        const buf = await this.bf(imgInput);
        const up = await this.ul(buf);
        payload = {
          ...payload,
          image_urls: [up.url],
          uploadIds: [up.id],
          imageHash: up.hash,
          image_size: rest.image_size || "auto"
        };
      } else {
        console.log("📝 Processing T2I mode...");
        payload = {
          ...payload,
          width: rest.width || 512,
          height: rest.height || 512,
          num_inference_steps: rest.steps || 30
        };
      }
      const {
        data: job
      } = await this.client.post(endpoint, payload);
      if (!job?.data?.taskId) throw new Error("No Task ID received");
      const res = await this.wt(job.data.taskId);
      console.log("✅ Success");
      return res;
    } catch (e) {
      console.error(`❌ Process Error: ${e.message}`);
      return {
        error: e.message
      };
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      if (Array.isArray(imageUrl)) {
        console.log(`📦 Batch processing detected: ${imageUrl.length} items`);
        const results = [];
        let idx = 1;
        for (const img of imageUrl) {
          console.log(`\n--- Item ${idx++}/${imageUrl.length} ---`);
          try {
            const res = await this.processOne(prompt, img, rest);
            results.push(res);
          } catch (innerErr) {
            results.push({
              error: innerErr.message
            });
          }
        }
        return results;
      }
      return await this.processOne(prompt, imageUrl, rest);
    } catch (error) {
      console.error("❌ Critical Error:", error.message);
      return {
        error: error.message
      };
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
  const api = new NanoBanana();
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