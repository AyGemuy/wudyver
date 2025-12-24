import axios from "axios";
class TypliLyricsGenerator {
  constructor(apiKey = undefined) {
    this.baseUrl = "https://typli.ai/api/generators/chat";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
      Referer: "https://typli.ai/ai-writer/song-lyric-generator",
      "Accept-Encoding": "gzip, deflate, br"
    };
    this.generatorId = this._generateRandomId();
    this.slug = "ai-writer/song-lyric-generator";
  }
  _generateRandomId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async generate({
    prompt,
    ...options
  }) {
    const payload = {
      id: this.generatorId,
      slug: this.slug,
      messages: [{
        role: "user",
        content: prompt || "men in feel",
        parts: [{
          type: "text",
          text: prompt || "men in feel"
        }]
      }],
      ...options
    };
    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: this.defaultHeaders,
        decompress: true,
        timeout: 1e4
      });
      const lyrics = this._parseResponse(response.data);
      return {
        success: true,
        result: lyrics
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        metadata: {
          prompt: prompt,
          generatorId: this.generatorId
        }
      };
    }
  }
  _parseResponse(data) {
    if (typeof data === "string") {
      const extractedText = data.split("\n").filter(line => line.trim().startsWith('0:"')).map(line => {
        try {
          const startIndex = line.indexOf('0:"') + 3;
          const endIndex = line.lastIndexOf('"');
          return JSON.parse(`"${line.slice(startIndex, endIndex)}"`);
        } catch {
          return null;
        }
      }).filter(Boolean).join("");
      return extractedText || "Tidak ada teks yang dihasilkan.";
    }
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    if (data?.data?.content) {
      return data.data.content;
    }
    throw new Error("Format data tidak sesuai.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const generator = new TypliLyricsGenerator();
    const generated = await generator.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}