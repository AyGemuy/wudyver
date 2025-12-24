import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import crypto from "crypto";
class GeminiChat {
  constructor() {
    this.chatUrl = "https://gemini-ultra-iota.vercel.app/api/chat";
    this.uploadUrl = "https://gemini-ultra-iota.vercel.app/api/google/upload/v1beta/files?uploadType=multipart";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://gemini-ultra-iota.vercel.app",
      priority: "u=1, i",
      referer: "https://gemini-ultra-iota.vercel.app/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  generateToken() {
    const token = Buffer.from(`${crypto.randomBytes(32).toString("hex")}@${Date.now()}`).toString("base64");
    return token;
  }
  async uploadFromUrl(input, filename = "image.jpg") {
    const DEFAULT_BASE64_MIMETYPE = "image/jpeg";
    let buffer;
    let mimeType = DEFAULT_BASE64_MIMETYPE;
    if (input instanceof Buffer) {
      buffer = input;
    } else if (typeof input === "string") {
      if (input.startsWith("data:")) {
        const match = input.match(/^data:(image\/[a-z0-9\+\-\.]+);base64,(.*)$/i);
        if (!match || match.length !== 3) {
          throw new Error("Invalid Base64 Data URL format.");
        }
        mimeType = match[1];
        buffer = Buffer.from(match[2], "base64");
        if (!mimeType.startsWith("image/")) {
          throw new Error(`Invalid MIME type in Base64 Data URL: ${mimeType}`);
        }
      } else {
        try {
          const response = await axios.get(input, {
            responseType: "arraybuffer",
            timeout: 1e4
          });
          buffer = response.data;
          mimeType = response.headers["content-type"] || DEFAULT_BASE64_MIMETYPE;
          if (!mimeType.startsWith("image/")) {
            throw new Error(`Invalid MIME type fetched from URL: ${mimeType}`);
          }
        } catch (error) {
          if (error.code === "ERR_INVALID_URL" || error.message.includes("Failed to fetch") || error.message.includes("timeout")) {
            buffer = Buffer.from(input, "base64");
          } else {
            throw new Error(`Failed to process input as URL or Base64: ${error.message}`);
          }
        }
      }
    } else {
      throw new Error(`Invalid image input type. Expected URL (string), Base64 (string), or Buffer.`);
    }
    try {
      const form = new FormData();
      form.append("file", new Blob([JSON.stringify({
        file: {
          mimeType: mimeType,
          displayName: filename
        }
      })], {
        type: "application/json"
      }), "metadata.json");
      form.append("file", new Blob([buffer], {
        type: mimeType
      }), filename);
      const headers = form.getHeaders ? form.getHeaders() : form.headers;
      const res = await axios.post(this.uploadUrl, form, {
        headers: {
          ...this.headers,
          ...headers
        }
      });
      if (!res.data?.file?.uri) throw new Error("Upload gagal: URI tidak ditemukan");
      const uri = res.data.file.uri;
      console.log("[file uri]", uri);
      return {
        uri: uri,
        mimeType: mimeType
      };
    } catch (err) {
      console.error("[upload failed]", err.message);
      return {};
    }
  }
  async chat({
    prompt,
    imageUrl = "",
    messages = [],
    model = "gemini-1.5-flash-latest",
    top_k = 64,
    top_p = .95,
    temp = 1,
    maxOutputTokens = 8192,
    max_token,
    token = "",
    safety = "none"
  }) {
    try {
      if (!token) token = this.generateToken();
      console.log("[token used]", token);
      const url = `${this.chatUrl}?token=${encodeURIComponent(token)}`;
      const parts = [];
      if (imageUrl) {
        const {
          uri,
          mimeType
        } = await this.uploadFromUrl(imageUrl);
        if (!uri || !mimeType) throw new Error("Upload gagal");
        parts.push({
          fileData: {
            mimeType: mimeType,
            fileUri: uri
          }
        });
      }
      parts.push({
        text: prompt
      });
      const payload = {
        messages: messages.length ? messages : [{
          role: "user",
          parts: parts
        }],
        model: model,
        generationConfig: {
          topP: top_p,
          topK: top_k,
          temperature: temp,
          maxOutputTokens: max_token || maxOutputTokens
        },
        safety: safety
      };
      const res = await axios.post(url, JSON.stringify(payload), {
        headers: this.headers
      });
      if (!res.data) throw new Error("Gagal mendapatkan respons dari Gemini");
      return res.data;
    } catch (err) {
      console.error("[chat error]", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const gemini = new GeminiChat();
    const response = await gemini.chat(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}