import axios from "axios";
import qs from "qs";
class PolliNations {
  constructor() {
    this.availableModels = ["flux", "turbo", "gptimage", "dall-e-3", "stabilityai"];
    this.randomNum = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    this.apiClient = axios.create({
      baseURL: "https://text.pollinations.ai",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.imageClient = axios.create({
      baseURL: "https://image.pollinations.ai"
    });
    this.headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    prompt,
    messages,
    imageUrl,
    model = "openai-large",
    temperature = .8,
    max_tokens = 16e3,
    seed = this.randomNum,
    private: isPrivate = false,
    stream = false
  }) {
    console.log("[ChatService] Memulai proses chat...", {
      model: model,
      temperature: temperature,
      max_tokens: max_tokens,
      seed: seed,
      private: isPrivate,
      stream: stream
    });
    let imageData = null;
    if (imageUrl) {
      console.log("[ChatService] Memproses gambar dari URL...");
      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        const contentType = imageResponse.headers["content-type"];
        const base64Image = Buffer.from(imageResponse.data, "binary").toString("base64");
        imageData = {
          type: "image_url",
          image_url: {
            url: `data:${contentType};base64,${base64Image}`
          }
        };
        console.log("[ChatService] Gambar berhasil diproses dan dienkode ke base64.");
      } catch (error) {
        console.error("[ChatService] Gagal memproses gambar:", error.message);
      }
    } else {
      console.log("[ChatService] Tidak ada URL gambar untuk diproses.");
    }
    const payload = {
      model: model,
      messages: messages?.length ? messages : [{
        role: "user",
        content: prompt
      }],
      temperature: temperature,
      max_tokens: max_tokens,
      seed: seed,
      stream: stream,
      private: isPrivate
    };
    payload.messages = payload.messages || [];
    if (imageData) {
      const lastMessage = payload.messages[payload.messages.length - 1];
      if (lastMessage?.content) {
        payload.messages = [...payload.messages.slice(0, -1), {
          ...lastMessage,
          content: Array.isArray(lastMessage.content) ? [...lastMessage.content, imageData] : [{
            type: "text",
            text: lastMessage.content
          }, imageData]
        }];
      } else {
        payload.messages = [...payload.messages, {
          role: "user",
          content: [imageData]
        }];
      }
    } else if (prompt && !payload.messages.length) {
      payload.messages = [{
        role: "user",
        content: prompt
      }];
    }
    console.log("[ChatService] Payload permintaan yang dibuat:", payload);
    try {
      console.log("[ChatService] Mengirim permintaan ke API...");
      const response = await this.apiClient.post("/openai", payload);
      console.log("[ChatService] Permintaan berhasil, menerima respons...");
      return response.data;
    } catch (error) {
      console.error("[ChatService] Terjadi kesalahan saat memanggil API:", error.response ? error.response.data : error.message);
      throw error;
    } finally {
      console.log("[ChatService] Proses chat selesai.");
    }
  }
  async image({
    prompt = "Cars",
    model = 1,
    width = 1024,
    height = 1792,
    nologo = true,
    enhance = true,
    safe = false,
    seed = this.randomNum
  }) {
    let modelApiKey;
    try {
      modelApiKey = this.availableModels[model - 1] || this.availableModels[0];
    } catch (e) {
      console.warn(`[ImageService] Gagal mengakses model ${model}, menggunakan default. Error: ${e.message}`);
      modelApiKey = this.availableModels[0];
    }
    const imageParamsForQs = {
      width: width,
      height: height,
      model: modelApiKey,
      seed: seed,
      nologo: nologo,
      enhance: enhance,
      safe: safe
    };
    Object.keys(imageParamsForQs).forEach(key => {
      if (imageParamsForQs[key] === undefined || imageParamsForQs[key] === null) {
        delete imageParamsForQs[key];
      }
    });
    const queryString = qs.stringify(imageParamsForQs);
    const constructedImageUrl = `/prompt/${encodeURIComponent(prompt)}?${queryString}`;
    console.log("[clientAI - Image] Fetching image from:", this.imageClient.defaults.baseURL + constructedImageUrl);
    try {
      const response = await this.imageClient.get(constructedImageUrl, {
        responseType: "arraybuffer"
      });
      console.log("[clientAI - Image] Image fetched successfully.");
      return {
        data: Buffer.from(response.data, "binary")
      };
    } catch (error) {
      console.error("[clientAI - Image] Error fetching image:", error.response ? error.response.data : error.message);
      throw new Error(`Failed to fetch image: ${error.message}`);
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
      error: "Missing required field: action",
      required: {
        action: "chat | image"
      }
    });
  }
  const client = new PolliNations();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt && (!params.messages || params.messages.length === 0)) {
          return res.status(400).json({
            error: `Missing required field: prompt or messages (required for ${action})`
          });
        }
        result = await client.chat(params);
        return res.status(200).json({
          success: true,
          result: result
        });
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        if (params.model !== undefined) {
          try {
            params.model = parseInt(String(params.model), 10);
            if (isNaN(params.model) || params.model < 0 || params.model >= client.availableModels.length) {
              console.warn(`[Handler] Invalid model: ${params.model}. Defaulting to 0.`);
              params.model = 0;
            }
          } catch (e) {
            console.warn(`[Handler] Error parsing model: ${params.model}. Defaulting to 0. Error: ${e.message}`);
            params.model = 0;
          }
        }
        ["nologo", "enhance", "safe"].forEach(key => {
          if (params[key] !== undefined && typeof params[key] === "string") {
            params[key] = params[key].toLowerCase() === "true";
          }
        });
        ["width", "height", "seed"].forEach(key => {
          if (params[key] !== undefined && typeof params[key] === "string") {
            try {
              const numValue = parseInt(params[key], 10);
              if (!isNaN(numValue)) {
                params[key] = numValue;
              } else {
                delete params[key];
              }
            } catch (e) {
              console.warn(`[Handler] Error parsing numeric param ${key}: ${params[key]}. Removing. Error: ${e.message}`);
              delete params[key];
            }
          }
        });
        const imageResult = await client.image(params);
        res.setHeader("Content-Type", "image/png");
        return res.status(200).send(imageResult.data);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
  } catch (error) {
    console.error(`[Handler Error - ${action}]`, error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`,
      details: error.stack
    });
  }
}