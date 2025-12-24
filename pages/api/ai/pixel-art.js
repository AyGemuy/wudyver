import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class PixelArtGenerator {
  constructor() {
    this.baseURL = "https://pixelartgenerator.app/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://pixelartgenerator.app/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    try {
      console.log("Starting text-to-image generation...");
      const {
        data
      } = await axios.post(`${this.baseURL}/pixel/generate`, {
        size: "2:3",
        type: "text",
        prompt: prompt,
        ...rest
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      console.log("Text-to-image successful, task ID:", data?.taskId);
      return data;
    } catch (error) {
      console.error("Text-to-image failed:", error?.response?.data || error.message);
      throw new Error(`txt2img failed: ${error?.response?.data?.message || error.message}`);
    }
  }
  async status({
    task_id
  }) {
    try {
      console.log("Checking status for task:", task_id);
      const {
        data
      } = await axios.get(`${this.baseURL}/pixel/status`, {
        params: {
          taskId: task_id
        },
        headers: this.headers
      });
      console.log("Status check successful:", data?.status);
      return data;
    } catch (error) {
      console.error("Status check failed:", error?.response?.data || error.message);
      throw new Error(`Status check failed: ${error?.response?.data?.message || error.message}`);
    }
  }
  async img2img({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Starting image-to-image transformation...");
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15e3
      });
      const contentType = imageResponse.headers?.["content-type"] || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : contentType.includes("webp") ? "webp" : "jpg";
      console.log(`Image type detected: ${contentType}`);
      const {
        data: presignedData
      } = await axios.post(`${this.baseURL}/upload/presigned-url`, {
        filename: `image.${ext}`,
        contentType: contentType,
        type: "pixel-art-source"
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      const {
        uploadUrl,
        key,
        publicUrl
      } = presignedData?.data || {};
      await axios.put(uploadUrl, imageResponse.data, {
        headers: {
          "Content-Type": contentType,
          ...this.headers
        },
        timeout: 2e4
      });
      console.log("Image uploaded successfully");
      const {
        data: result
      } = await axios.post(`${this.baseURL}/pixel/generate`, {
        size: rest.size || "2:3",
        type: "image",
        imageKey: key,
        prompt: rest.prompt || "",
        ...rest
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      console.log("Image-to-image transformation completed");
      return result;
    } catch (error) {
      console.error("Image-to-image failed:", error?.response?.data || error.message);
      throw new Error(`img2img failed: ${error?.response?.data?.message || error.message}`);
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
      error: "Action is required."
    });
  }
  const pixelArt = new PixelArtGenerator();
  try {
    let response;
    switch (action) {
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl are required for img2img."
          });
        }
        response = await pixelArt.img2img(params);
        return res.status(200).json(response);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await pixelArt.txt2img(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await pixelArt.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2img', 'txt2img', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}