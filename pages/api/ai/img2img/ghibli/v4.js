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
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
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
    prompt = this.getRandomPrompt(),
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