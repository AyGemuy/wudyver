import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ImageDescriber {
  constructor() {
    this.baseUrl = "https://describeimage.ai/api";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://describeimage.ai",
      priority: "u=1, i",
      referer: "https://describeimage.ai/",
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
      const contentType = response.headers["content-type"] || "image/jpeg";
      const base64 = Buffer.from(response.data).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  async describe({
    imageUrl: image,
    isUrl = false,
    systemPrompt = "You are a general image analysis expert. Please comprehensively analyze the content of the image. Please provide your response in plain text format without any markdown formatting.",
    prompt: userPrompt = "Please analyze the overall content of this image, including main content, scene characteristics, and visual effects.",
    language = "en",
    stream = false
  }) {
    try {
      let payload = {
        image: isUrl ? image : await this.getImageBase64(image),
        isUrl: isUrl,
        isBlobUrl: false,
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        language: language,
        stream: stream
      };
      const response = await axios.post(`${this.baseUrl}/describe-image-gemini`, payload, {
        headers: this.defaultHeaders
      });
      return response.data;
    } catch (error) {
      console.error("Error describing image:", error);
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
    const describer = new ImageDescriber();
    const response = await describer.describe(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}