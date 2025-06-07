import axios from "axios";
class XImageGenerator {
  constructor() {
    this.baseURL = "https://ximagegenerator.art/api/predictions";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://ximagegenerator.art/"
    };
  }
  async create({
    prompt = "Anime girl with long hair, among cherry blossoms",
    model = "stable-diffusion-xl-fast",
    ratio = "1:1"
  }) {
    try {
      const response = await axios.post(this.baseURL, {
        prompts: prompt,
        ratio: ratio,
        model: model,
        isPublic: true,
        user: null,
        generatorName: "x-image-generator"
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to create image");
    }
  }
  listModels() {
    return ["stable-diffusion-xl-fast", "stable-diffusion-xl-base", "dreamshaper-8-base"];
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    model
  } = req.method === "GET" ? req.query : req.body;
  const xImageGen = new XImageGenerator();
  try {
    switch (action) {
      case "create":
        const result = await xImageGen.create({
          prompt: prompt,
          model: model
        });
        return res.status(200).json(result);
        break;
      case "list":
        const models = xImageGen.listModels();
        return res.status(200).json(models);
        break;
      default:
        res.status(400).json({
          error: "Invalid action"
        });
        break;
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}