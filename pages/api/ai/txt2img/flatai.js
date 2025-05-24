import axios from "axios";
import * as cheerio from "cheerio";
class FlataiAPI {
  constructor() {
    this.url = "https://api.fsh.plus/html?url=https://flatai.org/ai-image-generator-free-no-signup/";
    this.ajaxUrl = "https://flatai.org/wp-admin/admin-ajax.php";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://flatai.org",
      Referer: "https://flatai.org/ai-image-generator-free-no-signup/",
      "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest"
    };
  }
  async fetchNonce() {
    try {
      const response = await axios.get(this.url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const scriptContent = $("script#jquery-core-js-extra").html();
      const startIndex = scriptContent.indexOf("{");
      const endIndex = scriptContent.lastIndexOf("}");
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonString = scriptContent.slice(startIndex, endIndex + 1);
        const jsonObject = JSON.parse(jsonString);
        if (jsonObject && jsonObject.ai_generate_image_nonce) {
          return jsonObject.ai_generate_image_nonce;
        }
      }
      throw new Error("Nonce not found");
    } catch (error) {
      throw new Error(`Error fetching nonce: ${error.message}`);
    }
  }
  async generateImage({
    prompt,
    ratio = "1:1",
    seed = "4204177106"
  }) {
    const nonce = await this.fetchNonce();
    const data = new URLSearchParams();
    data.append("action", "ai_generate_image");
    data.append("nonce", nonce);
    data.append("prompt", prompt);
    data.append("aspect_ratio", ratio);
    data.append("seed", seed);
    try {
      const response = await axios.post(this.ajaxUrl, data, {
        headers: this.headers
      });
      if (response.data.success && response.data.data.images && response.data.data.images[0]) {
        const base64Image = response.data.data.images[0].split(",")[1];
        const buffer = Buffer.from(base64Image, "base64");
        return buffer;
      }
      throw new Error("Image generation failed");
    } catch (error) {
      throw new Error(`Error generating image: ${error.message}`);
    }
  }
  async generateImageFromPrompt({
    prompt,
    ratio,
    seed
  }) {
    try {
      const result = await this.generateImage({
        prompt: prompt,
        ratio: ratio,
        seed: seed
      });
      return result;
    } catch (error) {
      throw new Error(`Error in image generation: ${error.message}`);
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
    const flatai = new FlataiAPI();
    const imageBuffer = await flatai.generateImageFromPrompt(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", imageBuffer.length);
    return res.status(200).send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}