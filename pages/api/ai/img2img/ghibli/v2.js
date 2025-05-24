import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class GhibliStyle {
  constructor() {
    this.apiUrl = "https://ghiblistyle.space/api/generate";
    this.headers = {
      accept: "*/*",
      "content-type": "multipart/form-data",
      origin: "https://ghiblistyle.space",
      referer: "https://ghiblistyle.space/en/ghibli-style-generate",
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
    mode = "image-to-image",
    prompt = this.getRandomPrompt(),
    size = "1024x1024",
    n = 1
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
      formData.append("mode", mode);
      formData.append("image", imageBlob, fileName);
      formData.append("prompt", prompt);
      formData.append("size", size);
      formData.append("n", n);
      return await this.sendRequest(formData);
    } catch (error) {
      throw new Error(`Failed to process image-to-image request: ${error.message}`);
    }
  }
  async txt2img({
    quality = "standard",
    mode = "text-to-image",
    prompt = "Create a [Type of Shot] portrait from photo of a person [Based on Uploaded Image / Described Here]. They have [Hair Details], [Eye Details], wearing [Clothing Details], with a [Expression] expression. The style should be custom Ghibli art, reminiscent of Hayao Miyazaki's films, with soft lines and watercolor textures. Make it feel like a personal animation still.",
    style = "natural",
    size = "1024x1024",
    n = 1
  }) {
    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("prompt", prompt);
      formData.append("size", size);
      formData.append("quality", quality);
      formData.append("style", style);
      formData.append("n", n);
      return await this.sendRequest(formData);
    } catch (error) {
      throw new Error(`Failed to process text-to-image request: ${error.message}`);
    }
  }
  async download({
    imageUrl
  }) {
    try {
      const {
        buffer
      } = await this.getDataBuffer(imageUrl);
      return Buffer.from(buffer);
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
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
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "txt2img | img2img"
      }
    });
  }
  const ghibli = new GhibliStyle();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await ghibli[action](params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await ghibli[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}