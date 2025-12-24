import {
  FormData
} from "formdata-node";
import axios from "axios";
class GenerateImage {
  constructor() {
    this.url = "https://otomaticporn.com/xhr/landing_generate.php";
    this.baseUrl = "https://otomaticporn.com";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Content-Type": "multipart/form-data",
      Origin: "https://otomaticporn.com",
      Priority: "u=1, i",
      Referer: "https://otomaticporn.com/",
      "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "Sec-CH-UA-Mobile": "?1",
      "Sec-CH-UA-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateImage(prompt) {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("email", "");
    try {
      const response = await axios.post(this.url, form, {
        headers: {
          ...this.headers
        }
      });
      const imageUrl = response.data.url;
      if (imageUrl) {
        const fullImageUrl = `${this.baseUrl}${imageUrl}`;
        const imageResponse = await axios.get(fullImageUrl, {
          responseType: "arraybuffer"
        });
        return imageResponse.data;
      } else {
        throw new Error("No image URL found in the response");
      }
    } catch (error) {
      console.error("Error generating image:", error.message);
      throw new Error("Error generating image");
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const generate = new GenerateImage();
    const imageBuffer = await generate.generateImage(prompt);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    return res.status(200).send(imageBuffer);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}