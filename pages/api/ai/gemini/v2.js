import axios from "axios";
class GeminiAPI {
  constructor() {
    this.baseUrl = "https://us-central1-infinite-chain-295909.cloudfunctions.net/gemini-proxy-staging-v1";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
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
  async chat({
    model = "gemini-2.0-flash-lite",
    prompt,
    imageUrl = null,
    ...rest
  }) {
    if (!prompt) throw new Error("Prompt is required");
    const url = this.baseUrl;
    const parts = [];
    if (imageUrl) {
      const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      try {
        for (const url of urls) {
          const imagePart = await this.getData(url);
          parts.push(imagePart);
        }
      } catch (error) {
        console.error("An image failed to download, stopping process:", error);
        throw error;
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
    try {
      const response = await axios.post(url, body, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching Gemini response:", error.response ? error.response.data : error.message);
      throw error;
    }
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
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}