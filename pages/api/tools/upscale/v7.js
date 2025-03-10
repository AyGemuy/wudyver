import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class ImageEnhancer {
  constructor() {
    this.url = "https://ihancer.com/api/enhance";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      connection: "keep-alive",
      origin: "https://ihancer.com",
      pragma: "no-cache",
      referer: "https://ihancer.com/app/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "content-type": "multipart/form-data",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async fetchImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw error;
    }
  }
  async enhanceImage(imageBuffer, method = 2, maxImageSize = "low") {
    try {
      if (![1, 2, 3, 4].includes(method)) {
        throw new Error("Invalid method value. It should be between 1 and 4.");
      }
      if (!["low", "medium", "high"].includes(maxImageSize)) {
        throw new Error('Invalid max_image_size value. It should be "low", "medium", or "high".');
      }
      const form = new FormData();
      form.append("method", method.toString());
      form.append("is_pro_version", "false");
      form.append("is_enhancing_more", "false");
      form.append("max_image_size", maxImageSize);
      form.append("file", new Blob([imageBuffer], {
        type: "image/jpg"
      }), "file.jpg");
      const config = {
        headers: {
          ...this.headers
        },
        responseType: "arraybuffer"
      };
      const response = await axios.post(this.url, form, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async processImage(imageUrl, method = 2, maxImageSize = "low") {
    try {
      const imageBuffer = await this.fetchImageBuffer(imageUrl);
      const result = await this.enhanceImage(imageBuffer, method, maxImageSize);
      return result;
    } catch (error) {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    type = 2,
    level = "low"
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  try {
    const imageEnhancer = new ImageEnhancer();
    const result = await imageEnhancer.processImage(url, type, level);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result));
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}