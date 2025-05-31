import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class ImageGenerator {
  constructor() {
    this.baseUrl = "https://philschmid-image-generation-editing.hf.space/api/image";
    this.uploadUrl = "https://i.supa.codes/api/upload";
    this.headers = {
      accept: "*/*",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
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
      const uniqueid = Math.random().toString(36).substring(2, 15);
      console.log(`Starting image generation with unique ID: ${uniqueid}`);
      const imageBase64 = await this.convertUrlToBase64(imageUrl);
      if (!imageBase64) throw new Error("Failed to convert image URL to Base64.");
      const {
        data: generateResponse
      } = await axios.post(this.baseUrl, {
        prompt: prompt,
        image: imageBase64
      }, {
        headers: {
          ...this.headers,
          uniqueid: uniqueid
        }
      });
      if (generateResponse.image) {
        const buffer = Buffer.from(generateResponse.image.split(",")[1], "base64");
        return await this.uploadImage(buffer);
      } else {
        throw new Error("Image generation failed or no image data found.");
      }
    } catch (error) {
      console.error("Error generating image:", error.message);
    }
  }
  async convertUrlToBase64(imageUrl) {
    try {
      console.log("Fetching image data...");
      const {
        data,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/png";
      const imageBase64 = Buffer.from(data, "binary").toString("base64");
      return `data:${contentType};base64,${imageBase64}`;
    } catch (error) {
      console.error("Error converting image URL to Base64:", error.message);
      return null;
    }
  }
  async uploadImage(buffer) {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer]), "image.png");
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers
        }
      });
      if (!uploadResponse) throw new Error("Upload failed");
      return uploadResponse;
    } catch (error) {
      throw new Error("Error uploading image: " + error.message);
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
  const imageGenerator = new ImageGenerator();
  try {
    const data = await imageGenerator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}