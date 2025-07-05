import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class AiArtGenerator {
  constructor() {
    this.api = axios.create({
      baseURL: "https://aiart-zroo.onrender.com",
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Origin: "https://aiart-zroo.onrender.com",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://aiart-zroo.onrender.com/text-to-image",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "X-Forwarded-For": this._generateRandomIp(),
        "X-Real-IP": this._generateRandomIp()
      }
    });
  }
  _generateRandomIp() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 255) + 1).join(".");
  }
  async _fetchImageAndConvertToBase64(imageUrl) {
    try {
      console.log(`Fetching image from: ${imageUrl}`);
      const response = await this.api.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"] || "application/octet-stream";
      const imageBlob = new Blob([buffer], {
        type: contentType
      });
      const dataUriBase64 = `data:${contentType};base64,${buffer.toString("base64")}`;
      return {
        imageBlob: imageBlob,
        dataUriBase64: dataUriBase64,
        contentType: contentType
      };
    } catch (error) {
      console.error("Error fetching or converting image with Axios:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
      }
      return null;
    }
  }
  async enhance({
    prompt,
    ...rest
  }) {
    console.log("Starting prompt enhancement process...");
    const formData = new FormData();
    formData.append("prompt", prompt);
    for (const key in rest) {
      formData.append(key, rest[key]);
    }
    try {
      const response = await this.api.post("/api/enhance-prompt-ui", formData);
      console.log("Prompt enhancement successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error during prompt enhancement:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      return null;
    }
  }
  async txt2img({
    prompt,
    test_mode = "false",
    style_preset = "photographic",
    aspect_ratio = "9:16",
    output_format = "png",
    seed = "0",
    website = "",
    ...rest
  }) {
    console.log("Starting text-to-image generation process...");
    const formData = new FormData();
    formData.append("video_description", prompt);
    formData.append("test_mode", test_mode);
    formData.append("style_preset", style_preset);
    formData.append("aspect_ratio", aspect_ratio);
    formData.append("output_format", output_format);
    formData.append("seed", seed);
    formData.append("website", website);
    for (const key in rest) {
      formData.append(key, rest[key]);
    }
    try {
      const response = await this.api.post("/generate-txt2img-ui", formData);
      console.log("Text-to-image generation successful:", response.data);
      if (response.data && response.data.success && response.data.image_path) {
        const imageUrl = `https://aiart-zroo.onrender.com${response.data.image_path}?t=${Date.now()}`;
        return imageUrl;
      }
      console.error("Unexpected response format for txt2img:", response.data);
      return null;
    } catch (error) {
      console.error("Error during text-to-image generation:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      return null;
    }
  }
  async img2img({
    imageUrl,
    prompt,
    negative_prompt = "",
    strength = "0.7",
    style_preset = "photographic",
    aspect_ratio = "9:16",
    output_format = "png",
    seed = "0",
    website = "",
    ...rest
  }) {
    console.log("Starting image-to-image generation process...");
    const formData = new FormData();
    const imageProcessed = await this._fetchImageAndConvertToBase64(imageUrl);
    if (!imageProcessed) {
      console.error("Failed to process image from URL. Aborting img2img.");
      return null;
    }
    formData.append("image_file", imageProcessed.imageBlob, `image.${imageProcessed.contentType.split("/")[1] || "webp"}`);
    formData.append("image_data", imageProcessed.dataUriBase64);
    formData.append("video_description", prompt);
    formData.append("negative_prompt", negative_prompt);
    formData.append("strength", strength);
    formData.append("style_preset", style_preset);
    formData.append("aspect_ratio", aspect_ratio);
    formData.append("output_format", output_format);
    formData.append("seed", seed);
    formData.append("website", website);
    for (const key in rest) {
      formData.append(key, rest[key]);
    }
    try {
      const response = await this.api.post("/img2img", formData);
      console.log("Image-to-image generation successful:", response.data);
      if (response.data && response.data.success && response.data.image_path) {
        const resultImageUrl = `https://aiart-zroo.onrender.com${response.data.image_path}?t=${Date.now()}`;
        return resultImageUrl;
      }
      console.error("Unexpected response format for img2img:", response.data);
      return null;
    } catch (error) {
      console.error("Error during image-to-image generation:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      return null;
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
        action: "enhance | txt2img | img2img"
      }
    });
  }
  const aiArt = new AiArtGenerator();
  try {
    let result;
    switch (action) {
      case "enhance":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await aiArt.enhance(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await aiArt.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await aiArt.img2img(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: enhance | txt2img | img2img`
        });
    }
    if (result) {
      return res.status(200).json({
        result: result
      });
    } else {
      return res.status(500).json({
        error: "Failed to process request due to an internal error."
      });
    }
  } catch (error) {
    console.error("API Handler Error:", error.message);
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}