import axios from "axios";
class Grok {
  constructor() {
    this.apiKey = "xai-VGN9eRHC4ZAm5YlM66lIoXgtCAV5pdvXXM0a08EFvdkQBCfVxHAUufyYnZblKt42tWTKPtabsmbeuw2z";
    this.client = axios.create({
      baseURL: "https://api.x.ai/v1",
      timeout: 3600 * 1e3,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      }
    });
  }
  async chat({
    messages,
    images,
    model,
    stream,
    temperature
  }) {
    console.log(`[LOG] Mengirim request ke xAI...`);
    try {
      const imageList = images ? Array.isArray(images) ? images : [images] : [];
      const formattedMessages = this._buildMessages(messages, imageList);
      const payload = {
        messages: formattedMessages,
        model: model || "grok-4",
        stream: stream ?? false,
        temperature: temperature ?? 0
      };
      const response = await this.client.post("/chat/completions", payload, {
        responseType: payload.stream ? "stream" : "json"
      });
      return response.data;
    } catch (error) {
      const msg = error?.response?.data?.error?.message || error.message;
      console.error(`[ERROR] Gagal: ${msg}`);
      throw error;
    }
  }
  _buildMessages(input, images) {
    if (Array.isArray(input) && images.length === 0) {
      return input;
    }
    let msgs = Array.isArray(input) ? input : [{
      role: "system",
      content: "You are Grok, a helpful AI assistant."
    }];
    const textPrompt = typeof input === "string" ? input : "What is in this image?";
    const userContent = [];
    if (images.length > 0) {
      for (const img of images) {
        const url = this._processImage(img);
        userContent.push({
          type: "image_url",
          image_url: {
            url: url,
            detail: "high"
          }
        });
      }
    }
    userContent.push({
      type: "text",
      text: textPrompt
    });
    msgs.push({
      role: "user",
      content: userContent
    });
    return msgs;
  }
  _processImage(image) {
    if (Buffer.isBuffer(image)) {
      return `data:image/jpeg;base64,${image.toString("base64")}`;
    }
    if (typeof image === "string") {
      if (image.startsWith("http")) return image;
      if (image.startsWith("data:")) return image;
      return `data:image/jpeg;base64,${image}`;
    }
    throw new Error("Format gambar tidak didukung");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.messages) {
    return res.status(400).json({
      error: "Parameter 'messages' diperlukan"
    });
  }
  const api = new Grok();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}