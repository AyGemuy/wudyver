import axios from "axios";
import qs from "qs";
class PolliNations {
  constructor() {
    this.randomNum = Math.floor(Math.random() * 10 ** 6);
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
        console.error("[ChatService] Gagal memproses gambar:", error);
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
      console.error("[ChatService] Terjadi kesalahan saat memanggil API:", error);
      throw error;
    } finally {
      console.log("[ChatService] Proses chat selesai.");
    }
  }
  async image({
    prompt = "Cars",
    nologo = 1,
    seed = this.randomNum,
    height = 1920,
    width = 1080,
    w = 3840,
    q = 100
  }) {
    const params = qs.stringify({
      prompt: prompt,
      nologo: nologo,
      seed: seed,
      height: height,
      width: width,
      w: w,
      q: q
    });
    const imageUrl = `/prompt/${params}`;
    console.log("[clientAI - Image] Fetching image from:", this.imageClient.baseURL + imageUrl);
    try {
      const response = await this.imageClient.get(imageUrl, {
        responseType: "arraybuffer"
      });
      console.log("[clientAI - Image] Image fetched successfully.");
      return {
        data: Buffer.from(response.data, "binary")
      };
    } catch (error) {
      console.error("[clientAI - Image] Error fetching image:", error);
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
        if (!params.prompt && !params.messages?.length) {
          return res.status(400).json({
            error: `Missing required field: prompt or messages (required for ${action})`
          });
        }
        result = await client[action](params);
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
        const imageResult = await client[action](params);
        res.setHeader("Content-Type", "image/png");
        return res.status(200).send(imageResult.data);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}