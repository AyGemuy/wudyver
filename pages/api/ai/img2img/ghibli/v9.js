import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class GhibliImage {
  constructor() {
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }
  async generate({
    imageUrl,
    prompt = this.getRandomPrompt()
  }) {
    try {
      const {
        buffer,
        contentType,
        filename
      } = await this.getData(imageUrl);
      const formData = new FormData();
      formData.set("image", new Blob([buffer], {
        type: contentType
      }), filename);
      formData.append("prompt", prompt);
      const formHeaders = {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        connection: "keep-alive",
        "content-type": `multipart/form-data;`,
        origin: "https://ghiblistyleimage.tech",
        referer: "https://ghiblistyleimage.tech/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      };
      const response = await axios.post("https://ghiblistyleimage-259a05b765d7.herokuapp.com/generate-ghibli-image", formData, {
        headers: formHeaders
      });
      const {
        message,
        outputImagePath
      } = response.data;
      if (message && outputImagePath) {
        return {
          message: message,
          imageUrl: `https://ghiblistyleimage-259a05b765d7.herokuapp.com${outputImagePath}`
        };
      } else {
        throw new Error("No image generated or unexpected response format.");
      }
    } catch (error) {
      throw new Error("Error during image generation: " + error.message || error);
    }
  }
  async getData(imageUrl) {
    try {
      const {
        data: buffer,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/png";
      const extension = contentType.includes("jpeg") ? ".jpeg" : contentType.includes("png") ? ".png" : ".jpg";
      const filename = `image${extension}`;
      return {
        buffer: buffer,
        contentType: contentType,
        filename: filename
      };
    } catch (error) {
      throw new Error("Error retrieving image data: " + error.message || error);
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
  const ghibliImage = new GhibliImage();
  try {
    const data = await ghibliImage.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}