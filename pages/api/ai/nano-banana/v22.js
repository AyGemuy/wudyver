import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class NananaAI {
  constructor() {
    this.baseURL = "https://nanana.app/api";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://nanana.app/en",
        origin: "https://nanana.app",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
    this.fp = null;
  }
  async getFp() {
    if (!this.fp) this.fp = await this.genFp();
    return this.fp;
  }
  async genFp() {
    try {
      const visitorId = crypto.randomBytes(16).toString("hex");
      const signature = crypto.createHmac("sha256", "GOAT").update(visitorId).digest("hex");
      const raw = `${visitorId}.${signature}`;
      const encoded = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      return encoded;
    } catch (err) {
      console.warn("[WARN] FP generation failed:", err.message);
      const fallback = crypto.randomUUID().replace(/-/g, "");
      const sig = crypto.createHmac("sha256", "GOAT").update(fallback).digest("hex");
      return Buffer.from(`${fallback}.${sig}`).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }
  }
  async upload(imgData) {
    try {
      console.log("[INFO] Uploading image...");
      const form = new FormData();
      const buffer = Buffer.isBuffer(imgData) ? imgData : imgData.startsWith("http") ? (await axios.get(imgData, {
        responseType: "arraybuffer"
      })).data : Buffer.from(imgData.replace(/^data:image\/\w+;base64,/, ""), "base64");
      form.append("image", buffer, {
        filename: `image-${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      const {
        data
      } = await this.client.post("/upload-img", form, {
        headers: {
          ...form.getHeaders(),
          "x-fp-id": await this.getFp()
        }
      });
      console.log("[SUCCESS] Upload done:", data?.url);
      return data?.url;
    } catch (err) {
      console.error("[ERROR] Upload failed:", err.message);
      throw err;
    }
  }
  async submit(prompt, imageUrls) {
    try {
      console.log("[INFO] Submitting task...");
      const endpoint = imageUrls?.length ? "/image-to-image" : "/text-to-image";
      const payload = imageUrls?.length ? {
        prompt: prompt,
        image_urls: imageUrls
      } : {
        prompt: prompt
      };
      const {
        data
      } = await this.client.post(endpoint, payload, {
        headers: {
          "content-type": "application/json",
          "x-fp-id": await this.getFp()
        }
      });
      console.log("[SUCCESS] Task submitted:", data?.request_id);
      return data?.request_id;
    } catch (err) {
      console.error("[ERROR] Submit failed:", err.message);
      throw err;
    }
  }
  async poll(taskId, type) {
    try {
      console.log("[INFO] Polling result...");
      const {
        data
      } = await this.client.post("/get-result", {
        requestId: taskId,
        type: type || "text-to-image"
      }, {
        headers: {
          "content-type": "application/json",
          "x-fp-id": await this.getFp()
        }
      });
      console.log("[INFO] Poll status:", data?.completed ? "Completed" : "Processing");
      return data;
    } catch (err) {
      console.error("[ERROR] Poll failed:", err.message);
      throw err;
    }
  }
  async waitResult(taskId, type, delay = 3e3) {
    while (true) {
      const result = await this.poll(taskId, type);
      if (result?.completed) {
        console.log("[SUCCESS] Task completed");
        return result?.data;
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
  async generate({
    prompt,
    imageUrl
  }) {
    try {
      console.log("[INFO] Starting generation...");
      const imageUrls = [];
      if (imageUrl) {
        const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const img of urls)
          if (img) imageUrls.push(await this.upload(img));
      }
      const taskType = imageUrls.length ? "image-to-image" : "text-to-image";
      const taskId = await this.submit(prompt, imageUrls);
      const resultUrls = await this.waitResult(taskId, taskType);
      console.log("[SUCCESS] Generation done, total:", resultUrls.length);
      return resultUrls;
    } catch (err) {
      console.error("[ERROR] Generate failed:", err.message);
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
  const api = new NananaAI();
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