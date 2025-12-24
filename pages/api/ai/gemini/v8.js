import ApiKey from "@/configs/api-key";
import fetch from "node-fetch";
class Gemini {
  constructor({
    apiKeys = [],
    baseUrl = "https://generativelanguage.googleapis.com/v1beta"
  } = {}) {
    this.config = {
      apiKeys: apiKeys.length > 0 ? apiKeys : ApiKey.gemini || [],
      baseUrl: baseUrl,
      headers: {
        "Content-Type": "application/json"
      }
    };
    this.currentApiKey = null;
    if (this.config.apiKeys.length === 0) {
      console.warn("[Gemini] No API keys available");
    }
  }
  async executeWithFallback(fn) {
    let lastError = null;
    for (const apiKey of this.config.apiKeys) {
      this.currentApiKey = apiKey;
      console.log(`[TRY] Testing API key: ${String(apiKey).substring(0, 10)}...`);
      try {
        const result = await fn(this.currentApiKey);
        console.log(`[SUCCESS] API key berfungsi`);
        return result;
      } catch (error) {
        console.error(`[FAILED] API key gagal:`, error.message);
        lastError = error;
        continue;
      }
    }
    throw new Error(lastError?.message || "Semua API key gagal atau tidak tersedia");
  }
  async r(path, body) {
    return await this.executeWithFallback(async apiKey => {
      const url = `${this.config.baseUrl}${path}?key=${apiKey}`;
      console.log(`[POST] ${url}`);
      const res = await fetch(url, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log("[API OK]", res.status);
      return data;
    });
  }
  async _toB64(imageUrl) {
    if (!imageUrl) return null;
    try {
      if (Buffer.isBuffer(imageUrl)) {
        return imageUrl.toString("base64");
      }
      if (typeof imageUrl === "string") {
        if (!imageUrl.startsWith("http")) {
          return imageUrl.replace(/^data:image\/\w+;base64,/, "");
        }
        console.log("[IMG] fetch URL → arrayBuffer");
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`Image fetch ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        return buf.toString("base64");
      }
      throw new Error("imageUrl type not supported");
    } catch (e) {
      console.error("[IMG CONV ERR]", e.message);
      throw e;
    }
  }
  async _downloadFile(url) {
    return await this.executeWithFallback(async apiKey => {
      const fullUrl = `${url}?key=${apiKey}`;
      console.log(`[DOWNLOAD] ${fullUrl}`);
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error(`Download failed ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`[DOWNLOAD OK] ${buffer.length} bytes`);
      return buffer;
    });
  }
  async listModels() {
    return await this.executeWithFallback(async apiKey => {
      const url = `${this.config.baseUrl}/models?key=${apiKey}`;
      console.log(`[GET] ${url}`);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error?.message || ""}`);
      console.log("[MODELS] fetched successfully");
      return data;
    });
  }
  async chat({
    prompt,
    system,
    history = [],
    cfg = {},
    ...rest
  }) {
    console.log("[chat] start");
    try {
      const contents = [...system ? [{
        role: "model",
        parts: [{
          text: system
        }]
      }] : [], ...history.map(h => ({
        role: h.role ?? "user",
        parts: [{
          text: h.text
        }]
      })), {
        role: "user",
        parts: [{
          text: prompt
        }]
      }];
      return await this.r("/models/gemini-2.5-flash:generateContent", {
        contents: contents,
        generationConfig: cfg,
        ...rest
      });
    } catch (e) {
      console.error("[chat] failed");
      throw e;
    }
  }
  async p(name) {
    return await this.executeWithFallback(async apiKey => {
      const url = `${this.config.baseUrl}/${name}?key=${apiKey}`;
      console.log(`[POLL] ${url}`);
      while (true) {
        await new Promise(r => setTimeout(r, 2e3));
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(`Poll HTTP ${res.status}`);
        if (data.done) {
          console.log("[POLL DONE]");
          return data;
        }
      }
    });
  }
  async veo({
    prompt,
    ar = "16:9",
    neg = "",
    ...rest
  }) {
    console.log("[veo] start");
    try {
      const op = await this.r("/models/veo-3.1-generate-preview:predictLongRunning", {
        instances: [{
          prompt: prompt
        }],
        parameters: {
          aspectRatio: ar,
          negativePrompt: neg,
          ...rest
        }
      });
      const name = op?.name;
      if (!name) throw new Error("No operation name");
      const data = await this.p(name);
      const videoUri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (videoUri) {
        console.log("[veo] downloading video...");
        const videoBuffer = await this._downloadFile(videoUri);
        return {
          type: "video",
          mimeType: "video/mp4",
          buffer: videoBuffer,
          metadata: data
        };
      }
      throw new Error("No video URI in response");
    } catch (e) {
      console.error("[veo] failed");
      throw e;
    }
  }
  async imagen({
    prompt,
    cnt = 1,
    ...rest
  }) {
    console.log("[imagen] start");
    try {
      const data = await this.r("/models/imagen-4.0-generate-001:predict", {
        instances: [{
          prompt: prompt
        }],
        parameters: {
          sampleCount: cnt,
          ...rest
        }
      });
      const prediction = data?.predictions?.[0];
      if (prediction?.bytesBase64Encoded) {
        const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
        return {
          type: "image",
          mimeType: prediction.mimeType || "image/png",
          buffer: imageBuffer,
          metadata: data
        };
      }
      throw new Error("No image data in response");
    } catch (e) {
      console.error("[imagen] failed");
      throw e;
    }
  }
  async img({
    prompt,
    imageUrl,
    mime = "image/jpeg",
    ...rest
  }) {
    console.log("[img] start", imageUrl ? "img2img" : "txt2img");
    try {
      const data = await this._toB64(imageUrl);
      const parts = [{
        text: prompt
      }];
      if (data) {
        parts.push({
          inline_data: {
            mime_type: mime,
            data: data
          }
        });
      }
      const result = await this.r("/models/gemini-2.5-flash-image:generateContent", {
        contents: [{
          parts: parts
        }],
        ...rest
      });
      const imagePart = result?.candidates?.[0]?.content?.parts?.find(part => part.inlineData || part.inline_data);
      if (imagePart) {
        const inlineData = imagePart.inlineData || imagePart.inline_data;
        const imageBuffer = Buffer.from(inlineData.data, "base64");
        const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
        return {
          type: "image",
          mimeType: mimeType,
          buffer: imageBuffer,
          metadata: result
        };
      }
      throw new Error("No image data in response");
    } catch (e) {
      console.error("[img] failed");
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new Gemini();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt && !params.messages) {
          return res.status(400).json({
            error: "Parameter 'prompt' atau 'messages' wajib untuk 'chat'."
          });
        }
        response = await api.chat(params);
        return res.status(200).json(response);
      case "veo":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib untuk 'veo'."
          });
        }
        response = await api.veo(params);
        res.setHeader("Content-Type", response.mimeType);
        res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
        return res.status(200).send(response.buffer);
      case "imagen":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib untuk 'imagen'."
          });
        }
        response = await api.imagen(params);
        res.setHeader("Content-Type", response.mimeType);
        return res.status(200).send(response.buffer);
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib untuk 'image'."
          });
        }
        response = await api.img(params);
        res.setHeader("Content-Type", response.mimeType);
        return res.status(200).send(response.buffer);
      case "models":
        response = await api.listModels();
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: models, chat, veo, imagen, image.`
        });
    }
  } catch (error) {
    console.error(`[FATAL] action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Internal server error."
    });
  }
}