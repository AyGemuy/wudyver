import axios from "axios";
class ImageGenerator {
  constructor() {
    this.baseURL = "https://aiimagegenerator.vip/api/text-to-image/v2";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://aiimagegenerator.vip",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://aiimagegenerator.vip/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateImage({
    prompt,
    negative_prompt = "",
    style = "anime",
    width = 768,
    height = 1152
  }) {
    try {
      const response = await axios.post(this.baseURL, {
        data: {
          prompt: prompt,
          negative_prompt: negativePrompt,
          style: style,
          width: width,
          height: height
        }
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
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
  try {
    const imageGenerator = new ImageGenerator();
    const result = await imageGenerator.generateImage(params);
    if (result && result.data && result.data.image && result.data.image.startsWith("data:image/")) {
      const base64Data = result.data.image.split(";base64,").pop();
      const imageBuffer = Buffer.from(base64Data, "base64");
      const imageFormat = result.data.image.split(":")[1].split(";")[0];
      res.setHeader("Content-Type", imageFormat);
      return res.send(imageBuffer);
    } else {
      return res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}