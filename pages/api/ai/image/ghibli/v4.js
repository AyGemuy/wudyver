import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class GhibliAI {
  constructor() {
    this.apiUrl = "https://ghibli-ai.space/api/generate";
    this.headers = {
      accept: "*/*",
      "content-type": "multipart/form-data",
      origin: "https://ghibli-ai.space",
      referer: "https://ghibli-ai.space/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getDataBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return {
        buffer: response.data,
        contentType: response.headers["content-type"]
      };
    } catch (error) {
      throw new Error(`Failed to fetch data buffer: ${error.message}`);
    }
  }
  async img2img({
    imageUrl,
    prompt = "Create a [Type of Shot] portrait from photo of a person [Based on Uploaded Image / Described Here]. They have [Hair Details], [Eye Details], wearing [Clothing Details], with a [Expression] expression. The style should be custom Ghibli art, reminiscent of Hayao Miyazaki's films, with soft lines and watercolor textures. Make it feel like a personal animation still.",
    aspectRatio = "1:1",
    outputFormat = "png",
    outputQuality = "80"
  }) {
    try {
      const {
        buffer,
        contentType
      } = await this.getDataBuffer(imageUrl);
      const ext = contentType?.split("/")[1] || "png";
      const fileName = `${Date.now()}.${ext}`;
      const imageBlob = new Blob([buffer], {
        type: contentType
      });
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("file", imageBlob, fileName);
      formData.append("aspectRatio", aspectRatio);
      formData.append("outputFormat", outputFormat);
      formData.append("outputQuality", outputQuality);
      return await this.sendRequest(formData);
    } catch (error) {
      throw new Error(`Failed to process image-to-image request: ${error.message}`);
    }
  }
  async sendRequest(formData) {
    try {
      const response = await axios.post(this.apiUrl, formData, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibli = new GhibliAI();
  try {
    const data = await ghibli.img2img(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}