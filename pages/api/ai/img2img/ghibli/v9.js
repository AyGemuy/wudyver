import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class StabilityImageGenerator {
  constructor() {
    this.apiKey = "c2stRUlPYVFkREhjTlNVd2VWOTg2dE9TSmFacUlWdDVCakdRM0FnWU1FUVVkbEJvSGhW";
    this.apiUrl = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }
  getWsrvUrl(imageUrl) {
    return `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=1024&h=1024&fit=cover&a=attention`;
  }
  decrypt(encodedText) {
    return atob(encodedText);
  }
  async getImageBufferInfo(url) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = res.headers["content-type"] || "image/jpeg";
      const buffer = res.data;
      const ext = contentType.split("/")[1];
      return {
        buffer: buffer,
        contentType: contentType,
        ext: ext
      };
    } catch (err) {
      console.error("[ERROR] Failed to fetch image:", err.message);
      throw err;
    }
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async generate({
    imageUrl,
    mode = "IMAGE_STRENGTH",
    strength = "0.2",
    prompt = this.getRandomPrompt(),
    prompt_w = "1",
    n_prompt = this.getRandomPrompt(),
    n_prompt_w = "-1",
    steps = "50",
    cfg = "12",
    samples = "1",
    style = "fantasy-art"
  }) {
    try {
      const wsrvImage = this.getWsrvUrl(imageUrl);
      const {
        buffer,
        contentType,
        ext
      } = await this.getImageBufferInfo(wsrvImage);
      const form = new FormData();
      form.set("init_image", new Blob([buffer], {
        type: contentType
      }), `input.${ext}`);
      form.set("init_image_mode", mode);
      form.set("image_strength", strength);
      form.set("text_prompts[0][text]", prompt);
      form.set("text_prompts[0][weight]", prompt_w);
      form.set("text_prompts[1][text]", n_prompt);
      form.set("text_prompts[1][weight]", n_prompt_w);
      form.set("steps", steps);
      form.set("cfg_scale", cfg);
      form.set("samples", samples);
      form.set("style_preset", style);
      const headers = {
        ...form.headers,
        Authorization: `Bearer ${this.decrypt(this.apiKey)}`,
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: "https://ghibliimagegenerator.dev",
        Referer: "https://ghibliimagegenerator.dev/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10)"
      };
      const {
        data
      } = await axios.post(this.apiUrl, form, {
        headers: headers
      });
      console.log("[SUCCESS] Image generated successfully.");
      if (data?.artifacts?.[0]?.base64) {
        const base64String = data.artifacts[0].base64;
        const imageBuffer = Buffer.from(base64String, "base64");
        const uploaded = await this.uploadImage(imageBuffer);
        console.log("[UPLOAD SUCCESS]", uploaded);
        return uploaded;
      } else {
        console.log("[INFO] No base64 image found in response.");
        return data;
      }
    } catch (err) {
      console.error("[ERROR] Generation process failed:", err.message);
      throw err;
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
  const generator = new StabilityImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}