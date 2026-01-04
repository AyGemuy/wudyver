import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
class ImageUpscaler {
  constructor() {
    this.jar = new CookieJar();
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://image-upscaling.net/upscaling/en.html",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = wrapper(axios.create({
      baseURL: "https://image-upscaling.net",
      jar: this.jar,
      withCredentials: true,
      headers: this.headers
    }));
  }
  async resolveBuffer(source) {
    try {
      console.log("[Process] Resolving image source...");
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string" && (source.startsWith("http") || source.startsWith("https"))) {
        const res = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof source === "string") {
        const base64Data = source.includes("base64,") ? source.split("base64,")[1] : source;
        return Buffer.from(base64Data, "base64");
      }
      throw new Error("Invalid image source");
    } catch (e) {
      throw e;
    }
  }
  async initPage() {
    try {
      console.log("[Process] Initializing session (GET /upscaling)...");
      await this.client.get("/upscaling", {
        headers: {
          ...this.headers,
          "Upgrade-Insecure-Requests": "1",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-user": "?1"
        }
      });
      return true;
    } catch (e) {
      console.log("[Warn] Init page warning:", e.message);
      return false;
    }
  }
  async getPendingCount() {
    try {
      const {
        data
      } = await this.client.get("/upscaling_get_pending_requests");
      return parseInt(data) || 0;
    } catch (e) {
      return 0;
    }
  }
  async getStatus() {
    try {
      const {
        data
      } = await this.client.get("/upscaling_get_status");
      return data || {
        pending: [],
        processed: [],
        processing: []
      };
    } catch (e) {
      return {
        pending: [],
        processed: [],
        processing: []
      };
    }
  }
  async getAccountInfo() {
    try {
      console.log("[Process] Fetching account info...");
      const {
        data
      } = await this.client.get("/get_account_info");
      return data;
    } catch (e) {
      console.log("[Warn] Failed get info:", e.message);
      return null;
    }
  }
  async upload(buffer, options) {
    try {
      console.log("[Process] Uploading image...");
      const form = new FormData();
      const filename = `upload_${Date.now()}.jpg`;
      form.append("image", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      form.append("scale", String(options.scale || 4));
      form.append("model", options.model || "plus");
      form.append("prompt", options.prompt || "");
      form.append("creativity", String(options.creativity || .1));
      const headers = {
        ...this.headers,
        ...form.getHeaders(),
        origin: "https://image-upscaling.net",
        "content-type": form.getHeaders()["content-type"]
      };
      const {
        data
      } = await this.client.post("/upscaling_upload", form, {
        headers: headers
      });
      if (!data || typeof data !== "string") throw new Error("Upload failed, no ID returned");
      console.log(`[Process] Upload ID: ${data}`);
      return data;
    } catch (e) {
      throw new Error(`Upload Request Failed: ${e.message}`);
    }
  }
  async checkMedia(url) {
    try {
      const res = await this.client.head(url);
      const type = res.headers["content-type"];
      const length = res.headers["content-length"];
      const isValidType = type && (type.startsWith("image/") || type.includes("octet-stream") || type.includes("application/force-download"));
      return {
        ok: res.status === 200,
        mime: type,
        size: length,
        isValid: res.status === 200 && isValidType
      };
    } catch (e) {
      return {
        ok: false,
        status: e.response?.status
      };
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("--- Start Generation ---");
      await this.initPage();
      await this.getStatus();
      await this.getAccountInfo();
      const buffer = await this.resolveBuffer(imageUrl);
      const uploadId = await this.upload(buffer, rest);
      let finalUrl = null;
      let attempts = 0;
      const maxAttempts = 60;
      console.log("[Process] Waiting for processing...");
      while (!finalUrl && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3e3));
        await this.getPendingCount();
        const statusData = await this.getStatus();
        const doneItem = statusData?.processed?.find(url => url.includes(uploadId));
        if (doneItem) {
          finalUrl = doneItem;
        } else {
          const isPending = statusData?.pending?.some(url => url.includes(uploadId));
          console.log(`[Process] Waiting... (Attempt ${attempts + 1}) [${isPending ? "Pending" : "Processing"}]`);
        }
        attempts++;
      }
      if (!finalUrl) throw new Error("Timeout: Image processing took too long.");
      console.log(`[Process] Verifying media at: ${finalUrl}`);
      let mediaData = null;
      let checkAttempts = 0;
      const maxCheckAttempts = 60;
      while (!mediaData && checkAttempts < maxCheckAttempts) {
        const meta = await this.checkMedia(finalUrl);
        if (meta.isValid) {
          mediaData = meta;
        } else {
          console.log(`[Process] File not ready/propagated yet... (${checkAttempts + 1}/${maxCheckAttempts})`);
          await new Promise(r => setTimeout(r, 3e3));
          checkAttempts++;
        }
      }
      if (!mediaData) {
        console.log("[Warn] Verification failed, but returning URL anyway.");
        return {
          result: finalUrl,
          mime: "application/octet-stream",
          size: 0,
          type: "upscale",
          warning: "Media verification timed out"
        };
      }
      console.log("[Process] Success.");
      return {
        result: finalUrl,
        mime: mediaData.mime || "image/jpeg",
        size: parseInt(mediaData.size || 0),
        type: "upscale"
      };
    } catch (error) {
      console.error("[Error]", error.message);
      return {
        error: error.message,
        status: "failed"
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
  const api = new ImageUpscaler();
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