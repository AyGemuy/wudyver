import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ImagePromptGenerator {
  constructor() {
    this.baseUrl = "https://imageprompt.org/api/ai/prompts";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://imageprompt.org",
      priority: "u=1, i",
      referer: "https://imageprompt.org/image-to-prompt",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async getImageBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"] || "image/webp";
      const base64 = Buffer.from(response.data).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  async generatePrompt({
    imageUrl: image,
    language = "en",
    imageModelId = 0
  }) {
    try {
      const base64Url = typeof image === "string" && image.startsWith("http") ? await this.getImageBase64(image) : image;
      const payload = {
        base64Url: base64Url,
        imageModelId: imageModelId,
        language: language
      };
      const response = await axios.post(`${this.baseUrl}/image`, payload, {
        headers: this.defaultHeaders
      });
      return response.data;
    } catch (error) {
      console.error("Error generating prompt:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const describer = new ImagePromptGenerator();
    const response = await describer.generatePrompt(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}