import axios from "axios";
import FormData from "form-data";
class Gigapixel {
  constructor() {
    this.cfg = {
      baseUrl: "https://gigapixelai.com",
      uploadUrl: "https://upload-image-gigapixelai.tommy-ni1997.workers.dev/",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://gigapixelai.com",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      validModels: {
        image: ["flux-schnell", "nano-banana-pro", "qwen-image", "seedream-4", "seedream-4.5", "gigapixel", "ideogram-v3-turbo", "ideogram-character", "imagen-4", "wan-2.5", "grok-imagine", "4o-image", "midjourney"]
      }
    };
  }
  validateModel(modelId) {
    if (!this.cfg.validModels.image.includes(modelId)) {
      throw new Error(`Invalid model '${modelId}'. Valid models: ${this.cfg.validModels.image.join(", ")}`);
    }
    return true;
  }
  async req(url, method = "GET", data = null, customHeaders = {}) {
    try {
      console.log(`[REQ] ${method} -> ${url}`);
      const headers = {
        ...this.cfg.headers,
        ...customHeaders
      };
      if (url.includes("gigapixelai.com/api")) {
        headers["referer"] = "https://gigapixelai.com/ai-image-generator";
        headers["sec-fetch-site"] = "same-origin";
      } else {
        headers["referer"] = "https://gigapixelai.com/";
        headers["sec-fetch-site"] = "cross-site";
      }
      const response = await axios({
        url: url,
        method: method,
        data: data,
        headers: headers
      });
      return response?.data;
    } catch (e) {
      console.error(`[ERR] ${e.message}`);
      throw e?.response?.data || e;
    }
  }
  async uploadImage(input) {
    try {
      console.log("[LOG] Uploading image...");
      if (typeof input === "string" && input.includes("cdn1.gigapixelai.com")) {
        console.log("[LOG] Already CDN URL");
        return input;
      }
      const form = new FormData();
      let buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === "string") {
        if (input.startsWith("data:")) {
          buffer = Buffer.from(input.split(",")[1], "base64");
        } else if (input.startsWith("http")) {
          const response = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(response.data);
        } else {
          throw new Error("Invalid image format");
        }
      } else {
        throw new Error("Invalid image input");
      }
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      form.append("file", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      form.append("path", "upload/images/generator");
      const uploadHeaders = {
        ...form.getHeaders(),
        "content-type": form.getHeaders()["content-type"]
      };
      const response = await this.req(this.cfg.uploadUrl, "POST", form, uploadHeaders);
      if (!response?.url) throw new Error("Upload failed");
      console.log(`[LOG] Uploaded: ${response.url}`);
      return response.url;
    } catch (e) {
      console.error("[ERR] Upload failed:", e.message);
      throw e;
    }
  }
  async pollPrediction(predictionId, userId = "anonymous", modelId) {
    console.log("[LOG] Polling started...");
    let attempts = 0;
    const maxRetries = 60;
    while (attempts < maxRetries) {
      try {
        const params = {
          prediction_id: predictionId,
          user_id: userId,
          model_id: modelId
        };
        const query = new URLSearchParams(params).toString();
        const url = `${this.cfg.baseUrl}/api/imageGenerator/getPredictions?${query}`;
        const res = await this.req(url, "GET", null, {
          "content-type": "application/json"
        });
        if (res?.success) {
          const status = res?.data?.status;
          console.log(`[LOG] Status: ${status} (attempt ${attempts + 1}/${maxRetries})`);
          if (status === "succeeded") {
            return res.data;
          } else if (status === "failed") {
            throw new Error(res?.data?.error || "Generation failed");
          }
        }
        await new Promise(r => setTimeout(r, 3e3));
        attempts++;
      } catch (e) {
        console.error(`[ERR] Polling error: ${e.message}`);
        throw e;
      }
    }
    throw new Error("Timeout waiting for results");
  }
  async generate({
    prompt,
    imageUrl = null,
    model_id = "nano-banana-pro",
    user_id = "anonymous",
    ...options
  }) {
    try {
      this.validateModel(model_id);
      const mode = imageUrl ? "image-to-image" : "text-to-image";
      console.log(`[LOG] Mode: ${mode}, Model: ${model_id}`);
      let image_url = null;
      if (imageUrl) {
        image_url = await this.uploadImage(imageUrl);
        console.log(`[LOG] Image URL: ${image_url}`);
      }
      const payload = {
        user_id: user_id,
        prompt: prompt,
        model_id: model_id,
        mode: mode,
        ...options
      };
      if (mode === "image-to-image" && image_url) {
        payload.image_url = image_url;
      }
      console.log("[LOG] Payload:", JSON.stringify(payload, null, 2));
      const submitRes = await this.req(`${this.cfg.baseUrl}/api/imageGenerator`, "POST", payload, {
        "content-type": "application/json"
      });
      const predictionId = submitRes?.id;
      if (!predictionId) {
        throw new Error("Failed to get Prediction ID");
      }
      console.log(`[LOG] Task ID: ${predictionId}`);
      const result = await this.pollPrediction(predictionId, user_id, model_id);
      return {
        success: true,
        id: predictionId,
        result: result?.output,
        mode: mode,
        image_url: image_url || null
      };
    } catch (e) {
      console.error("[ERR] Generate failed:", e.message);
      return {
        success: false,
        error: e.message || "Unknown error"
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
  const api = new Gigapixel();
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