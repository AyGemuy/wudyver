import axios from "axios";
import ApiKey from "@/configs/api-key";
class GeminiAPI {
  constructor() {
    this.listKey = ApiKey.gemini;
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
    this.headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
    };
  }
  isBase64(str) {
    if (typeof str !== "string" || str.length === 0) {
      return false;
    }
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    let len = str.replace(/=+$/, "").length;
    return len % 4 === 0;
  }
  async getData(input) {
    const DEFAULT_BASE64_MIMETYPE = "image/jpeg";
    if (input instanceof Buffer) {
      return {
        inline_data: {
          mime_type: DEFAULT_BASE64_MIMETYPE,
          data: input.toString("base64")
        }
      };
    }
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        const match = input.match(/^data:(image\/[a-z0-9\+\-\.]+);base64,(.*)$/i);
        if (match && match.length === 3) {
          const mimeType = match[1];
          const base64Data = match[2];
          if (!mimeType.startsWith("image/")) {
            throw new Error(`Invalid MIME type in Base64 Data URL: ${mimeType}`);
          }
          return {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          };
        }
        throw new Error("Invalid Base64 Data URL format.");
      }
      if (this.isBase64(input)) {
        return {
          inline_data: {
            mime_type: DEFAULT_BASE64_MIMETYPE,
            data: input
          }
        };
      }
      try {
        const response = await axios.get(input, {
          responseType: "arraybuffer",
          timeout: 1e4
        });
        const mimeType = response.headers["content-type"] || DEFAULT_BASE64_MIMETYPE;
        if (!mimeType.startsWith("image/")) {
          throw new Error(`Invalid MIME type fetched from URL: ${mimeType}`);
        }
        return {
          inline_data: {
            mime_type: mimeType,
            data: Buffer.from(response.data).toString("base64")
          }
        };
      } catch (error) {
        throw new Error(`Failed to fetch image from URL ${input}: ${error.message}`);
      }
    }
    throw new Error(`Invalid image input type. Expected URL (string), Base64 (string), or Buffer.`);
  }
  async tryRequest(url, body) {
    let lastError = null;
    for (const apiKey of this.listKey) {
      const finalUrl = `${url}?key=${apiKey}`;
      try {
        const response = await axios.post(finalUrl, body, {
          headers: this.headers,
          timeout: 3e4
        });
        return response.data;
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.warn(`API key failed: ${msg}`);
        lastError = error;
        continue;
      }
    }
    const lastMsg = lastError?.response?.data?.error?.message || lastError?.message || "Unknown error";
    throw new Error(`All API keys failed. Last error: ${lastMsg}`);
  }
  async chat({
    model = "gemini-2.5-flash",
    prompt,
    imageUrl = null,
    ...rest
  }) {
    if (!prompt) throw new Error("Prompt is required");
    const parts = [];
    if (imageUrl) {
      const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      for (const url of urls) {
        try {
          const imagePart = await this.getData(url);
          parts.push(imagePart);
        } catch (error) {
          console.error("Image download failed:", error.message);
        }
      }
    }
    parts.push({
      text: prompt
    });
    const body = {
      contents: [{
        parts: parts
      }],
      ...rest
    };
    const url = `${this.baseUrl}${model}:generateContent`;
    return await this.tryRequest(url, body);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const gemini = new GeminiAPI();
  try {
    const data = await gemini.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Handler error:", error.message);
    return res.status(500).json({
      error: "Failed to process request",
      details: error.message
    });
  }
}