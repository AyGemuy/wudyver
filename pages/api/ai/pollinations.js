import axios from "axios";
import qs from "qs";
import FormData from "form-data";
class PolliNations {
  constructor() {
    this.imgbbConfig = {
      url: "https://api.imgbb.com/1/upload",
      key: "624e42298985c3cb644f4c12282b8d31",
      expiration: 21600,
      headers: {
        "User-Agent": "okhttp/5.3.2",
        "Accept-Encoding": "gzip"
      }
    };
    this.browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "Content-Type": "application/json",
      Accept: "*/*"
    };
    this.skey = "sk_HKIJFyshGDbq5jrUVUVRRtSqnEg6zeDx";
    this.clients = {
      text: axios.create({
        baseURL: "https://text.pollinations.ai",
        headers: this.browserHeaders
      }),
      image: axios.create({
        baseURL: "https://image.pollinations.ai",
        headers: this.browserHeaders
      }),
      gen: axios.create({
        baseURL: "https://gen.pollinations.ai",
        headers: this.browserHeaders
      })
    };
  }
  async run({
    mode,
    ...params
  }) {
    console.log(`\n[PolliNations] Starting Mode: ${mode?.toUpperCase()}`);
    try {
      if (!mode) throw new Error("Parameter 'mode' is required (chat | image | audio)");
      switch (mode.toLowerCase()) {
        case "chat":
          return await this._chat(params);
        case "image":
          return await this._image(params);
        case "audio":
          return await this._audio(params);
        default:
          throw new Error(`Invalid mode: ${mode}. Available: chat, image, audio.`);
      }
    } catch (error) {
      console.error(`[PolliNations] Critical Error in ${mode}:`, error.message);
      throw error;
    }
  }
  async _chat({
    messages = [],
    prompt,
    media = null,
    model = "openai",
    temperature = .7,
    seed,
    jsonMode = false
  }) {
    try {
      console.log("[Chat] Initializing...");
      if (!prompt && (!messages || messages.length === 0)) {
        throw new Error("Chat requires 'prompt' string or 'messages' array.");
      }
      let finalMessages = Array.isArray(messages) ? [...messages] : [];
      const userContent = [];
      if (prompt) userContent.push({
        type: "text",
        text: prompt
      });
      if (media) {
        console.log("[Chat] Processing media attachment...");
        const imageUrl = await this._resolveMedia(media);
        userContent.push({
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        });
        console.log(`[Chat] Media attached: ${imageUrl}`);
      }
      if (userContent.length > 0) {
        finalMessages.push({
          role: "user",
          content: userContent
        });
      }
      const payload = {
        model: model,
        messages: finalMessages,
        temperature: temperature,
        stream: false,
        jsonMode: jsonMode,
        ...seed && {
          seed: seed
        }
      };
      console.log("[Chat] Sending payload to OpenAI endpoint...");
      const response = await this.clients.text.post(`/openai?key=${this.skey}`, payload);
      console.log("[Chat] Success.");
      return response.data;
    } catch (error) {
      console.error("[Chat] Request Failed:", error.response?.data || error.message);
      throw new Error(`Chat Error: ${error.message}`);
    }
  }
  async _image({
    prompt,
    model = "flux",
    width = 1024,
    height = 1024,
    seed,
    nologo = true,
    enhance = true,
    safe = true
  }) {
    try {
      if (!prompt) throw new Error("Prompt is required for image generation.");
      const params = {
        width: width,
        height: height,
        model: model,
        nologo: nologo,
        enhance: enhance,
        safe: safe,
        seed: seed || Math.floor(Math.random() * 1e9),
        key: this.skey
      };
      const queryString = qs.stringify(params);
      const url = `/prompt/${encodeURIComponent(prompt)}?${queryString}`;
      console.log(`[Image] Fetching: ${this.clients.image.defaults.baseURL}${url}`);
      const response = await this.clients.image.get(url, {
        responseType: "arraybuffer"
      });
      console.log(`[Image] Success (${response.data.length} bytes).`);
      return {
        type: "buffer",
        mime: "image/jpeg",
        data: Buffer.from(response.data)
      };
    } catch (error) {
      console.error("[Image] Generation Failed:", error.message);
      throw new Error(`Image Gen Error: ${error.message}`);
    }
  }
  async _audio({
    prompt,
    model = "openai-audio",
    voice = "alloy"
  }) {
    try {
      if (!prompt) throw new Error("Prompt/Text is required for audio generation.");
      const params = {
        model: model,
        voice: voice,
        key: this.skey
      };
      const queryString = qs.stringify(params);
      const url = `/text/${encodeURIComponent(prompt)}?${queryString}`;
      console.log(`[Audio] Fetching: ${this.clients.gen.defaults.baseURL}${url}`);
      const response = await this.clients.gen.get(url, {
        responseType: "arraybuffer"
      });
      console.log(`[Audio] Success (${response.data.length} bytes).`);
      return {
        type: "buffer",
        mime: "audio/mpeg",
        data: Buffer.from(response.data)
      };
    } catch (error) {
      console.error("[Audio] Generation Failed:", error.message);
      throw new Error(`Audio Gen Error: ${error.message}`);
    }
  }
  async _resolveMedia(media) {
    try {
      if (typeof media === "string" && (media.startsWith("http://") || media.startsWith("https://"))) {
        return media;
      }
      let bufferToUpload;
      let filename = "upload.jpg";
      if (Buffer.isBuffer(media)) {
        bufferToUpload = media;
      } else if (typeof media === "string") {
        const base64Clean = media.replace(/^data:image\/\w+;base64,/, "");
        bufferToUpload = Buffer.from(base64Clean, "base64");
      } else {
        throw new Error("Media format not supported. Use Buffer, Base64 String, or URL.");
      }
      return await this._uploadToImgBB(bufferToUpload, filename);
    } catch (error) {
      console.error("[ResolveMedia] Error:", error.message);
      throw error;
    }
  }
  async _uploadToImgBB(buffer, filename) {
    try {
      console.log(`[ImgBB] Uploading buffer (${buffer.length} bytes)...`);
      const form = new FormData();
      form.append("image", buffer, {
        filename: filename
      });
      const config = {
        method: "POST",
        url: this.imgbbConfig.url,
        params: {
          key: this.imgbbConfig.key,
          expiration: this.imgbbConfig.expiration
        },
        headers: {
          ...this.imgbbConfig.headers,
          ...form.getHeaders()
        },
        data: form
      };
      const response = await axios.request(config);
      if (response.data && response.data.success) {
        const url = response.data.data.url;
        console.log(`[ImgBB] Upload Success: ${url}`);
        return url;
      } else {
        throw new Error("ImgBB API returned success: false");
      }
    } catch (error) {
      const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[ImgBB] Upload Failed: ${detail}`);
      throw new Error("Failed to upload image to ImgBB.");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new PolliNations();
  try {
    const result = await api.run(input);
    if (result.type === "buffer") {
      res.setHeader("Content-Type", result.mime);
      return res.status(200).send(result.data);
    }
    return res.status(200).json(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}