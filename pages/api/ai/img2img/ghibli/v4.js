import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AiGirlfriend {
  constructor() {
    this.url = "https://ai-girlfriend.me/api/generate-companion";
    this.headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
      referer: "https://ai-girlfriend.me/",
      ...SpoofHead()
    };
  }
  async generate({
    imageUrl,
    style = "ghibli",
    type = "female"
  }) {
    const userId = this.generateRandomUserId();
    const data = {
      imageUrl: imageUrl,
      style: style,
      type: type,
      userId: userId
    };
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error generating companion:", error.response?.data || error.message);
      throw error;
    }
  }
  generateRandomUserId() {
    return `${this.getRandomHex(1)}c133e38-${this.getRandomHex(1)}36d-${this.getRandomHex(1)}4d3-${this.getRandomHex(1)}c05-${this.getRandomHex(1)}6bfe97cf30${this.getRandomHex(1)}`;
  }
  getRandomHex(length) {
    return Math.floor(Math.random() * Math.pow(16, length)).toString(16).padStart(length, "0");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const generator = new AiGirlfriend();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}