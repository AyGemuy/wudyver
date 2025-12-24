import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AiImageGenerator {
  constructor() {
    this.apiUrl = "https://aiimagegenerator.io/api/model/v4";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      locale: "en-US",
      origin: "https://aiimagegenerator.io",
      platform: "PC",
      priority: "u=1, i",
      product: "AI_IMAGE_GENERATOR",
      referer: "https://aiimagegenerator.io/",
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
  async generate(params) {
    const body = {
      prompt: params.prompt,
      negativePrompt: params.negativePrompt || "",
      key: params.key || "RANDOM",
      width: params.width || 768,
      height: params.height || 512,
      quantity: params.quantity || 1,
      size: `${params.width || 768}x${params.height || 512}`
    };
    try {
      const res = await axios.post(this.apiUrl, body, {
        headers: this.headers
      });
      return res.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || err.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: 'Paramenter "prompt" wajib diisi.'
    });
  }
  const aiGen = new AiImageGenerator();
  try {
    const data = await aiGen.generate(params);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}