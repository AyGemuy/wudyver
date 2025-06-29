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
  async uploadFromUrl(imageUrl, filename = "image.jpg") {
    try {
      const {
        data: buffer,
        headers: resHeaders
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const mimeType = resHeaders["content-type"] || "image/jpeg";
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
      const res = await axios.post(this.uploadUrl, form, {
        headers: {
          ...this.headers,
          ...form.headers
        }
      });
      if (!res.data?.file?.uri) throw new Error("Upload gagal");
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