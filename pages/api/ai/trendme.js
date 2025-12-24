import fetch from "node-fetch";
import PROMPT from "@/configs/ai-prompt";
class GeminiService {
  constructor() {
    this.config = {
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      endpoint: "/models/gemini-2.5-flash-image-preview:generateContent",
      apiKey: this.decode("QUl6YVN5RFk3MEJiYndYYjRyWDR6WmJ5RUJiamp1MUtidVNEY3pn"),
      defaults: {
        temperature: .7,
        topK: 80,
        topP: .95,
        maxOutputTokens: 2048
      }
    };
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...opts
  }) {
    try {
      console.log(`🌐 Starting generation with prompt: ${prompt}`);
      const url = `${this.config.baseUrl}${this.config.endpoint}?key=${this.config.apiKey}`;
      console.log(`🌐 Request URL: ${url}`);
      const body = {
        contents: [{
          role: "user",
          parts: [{
            text: prompt
          }, ...imageUrl ? [await this.imgPart(imageUrl)] : []]
        }],
        generationConfig: {
          ...this.config.defaults,
          ...opts.generationConfig
        },
        ...opts
      };
      const bodyStr = JSON.stringify(body);
      console.log(`📦 Request Body: ${bodyStr.substring(0, 400)}...`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: bodyStr
      });
      console.log(`📡 Status: ${res.status}`);
      console.log(`📡 Headers: ${JSON.stringify(Object.fromEntries(res.headers))}`);
      if (res.status !== 200) {
        const errText = await res.text();
        console.log(`❌ HTTP Error: ${res.status} - ${errText}`);
        throw new Error(`Request failed: ${res.status}`);
      }
      const data = await res.json();
      console.log(`✅ Response structure: ${this.resStruct(data)}`);
      const imgData = this.extractImg(data);
      if (!imgData) {
        console.log("❌ No image data found");
        console.log(`Full response: ${JSON.stringify(data)}`);
        throw new Error("Image data not found");
      }
      const imageBuffer = Buffer.from(imgData, "base64");
      console.log(`[SUCCESS] Image buffer created (${imageBuffer.length} bytes)`);
      return imageBuffer;
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      throw new Error(`Generation failed: ${err.message}`);
    }
  }
  async imgPart(imgUrl) {
    try {
      if (imgUrl?.startsWith("data:")) {
        const match = imgUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        return match ? {
          inlineData: {
            mimeType: `image/${match[1]}`,
            data: match[2]
          }
        } : null;
      }
      if (imgUrl?.startsWith("http")) {
        const res = await fetch(imgUrl);
        const buffer = await res.arrayBuffer();
        const mime = res.headers.get("content-type") || "image/jpeg";
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          inlineData: {
            mimeType: mime,
            data: base64
          }
        };
      }
      const base64 = Buffer.isBuffer(imgUrl) ? imgUrl.toString("base64") : imgUrl;
      return base64 ? {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64
        }
      } : null;
    } catch (err) {
      console.log(`❌ Image prep error: ${err.message}`);
      throw err;
    }
  }
  extractImg(res) {
    return res?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data)?.inlineData?.data || null;
  }
  resStruct(obj) {
    if (!obj || typeof obj !== "object") return String(obj);
    if (Array.isArray(obj)) return `[${obj.length} items]`;
    const keys = Object.keys(obj).slice(0, 5);
    const more = Object.keys(obj).length > 5 ? "..." : "";
    return `{${keys.join(", ")}${more}}`;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  try {
    const api = new GeminiService();
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}