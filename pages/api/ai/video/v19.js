import axios from "axios";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class VeoApi {
  constructor() {
    this.baseURL = "https://salesupp.net";
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 6e4,
      headers: {
        "Content-Type": "application/json",
        ...SpoofHead()
      }
    });
  }
  log(message, data = null) {
    console.log(`[VeoApi] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async txt2img({
    prompt,
    aspect_ratio = "ASPECT_1_1",
    model = "V_2",
    magic_prompt_option = "AUTO",
    style_type = "AUTO",
    ...rest
  }) {
    try {
      this.log("Starting text to image generation", {
        prompt: prompt?.slice(0, 50) + "..."
      });
      if (!prompt?.trim()) {
        throw new Error("Please enter a prompt before generating an image.");
      }
      const payload = {
        image_request: {
          prompt: prompt.trim(),
          aspect_ratio: aspect_ratio,
          model: model,
          magic_prompt_option: magic_prompt_option,
          style_type: style_type,
          ...rest
        }
      };
      const response = await this.client.post("/api/proxy/ideogram", payload);
      this.log("Raw API Response:", response.data);
      if (!response.data?.operation) {
        throw new Error("No operation returned from server");
      }
      this.log("Image generation started", {
        operation: response.data.operation
      });
      const task_id = await this.enc({
        operation: response.data.operation
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      this.log("Image generation failed", error.message);
      throw error;
    }
  }
  async txt2vid({
    prompt,
    negativePrompt = "",
    enhancePrompt = true,
    seed = 1,
    duration = 5,
    ...rest
  }) {
    try {
      this.log("Starting text to video generation", {
        prompt: prompt?.slice(0, 50) + "..."
      });
      if (!prompt?.trim()) {
        throw new Error("Please enter a prompt before generating a video.");
      }
      const payload = {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt,
        enhancePrompt: enhancePrompt,
        seed: seed,
        duration: duration,
        ...rest
      };
      const response = await this.client.post("/generate-video", payload);
      this.log("Raw API Response:", response.data);
      if (!response.data?.operation) {
        throw new Error("No operation returned from server");
      }
      this.log("Video generation started", {
        operation: response.data.operation
      });
      const task_id = await this.enc({
        operation: response.data.operation
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      this.log("Video generation failed", error.message);
      throw error;
    }
  }
  async img2vid({
    prompt,
    imageUrl,
    negativePrompt = "",
    enhancePrompt = true,
    seed = 1,
    duration = 5,
    ...rest
  }) {
    try {
      this.log("Starting image to video generation", {
        prompt: prompt?.slice(0, 50) + "...",
        imageUrlType: this.detectImageType(imageUrl)
      });
      if (!prompt?.trim()) {
        throw new Error("Please enter a prompt before generating a video.");
      }
      if (!imageUrl) {
        throw new Error("imageUrl is required (can be URL, base64, or Buffer)");
      }
      const {
        imageBase64,
        mimeType
      } = await this.processImage(imageUrl);
      const payload = {
        prompt: prompt.trim(),
        imageBase64: imageBase64,
        mimeType: mimeType,
        negativePrompt: negativePrompt,
        enhancePrompt: enhancePrompt,
        seed: seed,
        duration: duration,
        ...rest
      };
      const response = await this.client.post("/generate-video/image", payload);
      this.log("Raw API Response:", response.data);
      if (!response.data?.operation) {
        throw new Error("No operation returned from server");
      }
      this.log("Image to video generation started", {
        operation: response.data.operation
      });
      const task_id = await this.enc({
        operation: response.data.operation
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      this.log("Image to video generation failed", error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        operation
      } = decryptedData;
      if (!operation) {
        throw new Error("Invalid task_id: Missing required data after decryption.");
      }
      if (!operation) {
        throw new Error("Operation ID is required");
      }
      this.log("Checking operation status", {
        operation: operation
      });
      const encodedOperation = encodeURIComponent(operation);
      const response = await this.client.get(`/check-status?operation=${encodedOperation}`);
      this.log("Raw Status Response:", response.data);
      const transformedResponse = {
        name: response.data.name,
        status: response.data.done ? "done" : "pending",
        result: []
      };
      if (response.data.response && response.data.response.videos) {
        transformedResponse.result = response.data.response.videos.map(video => ({
          url: video.gcsUri.replace("gs://salesup_veo3/", "https://storage.googleapis.com/salesup_veo3/"),
          mime: video.mimeType
        }));
      }
      this.log("Transformed Status Response:", transformedResponse);
      return transformedResponse;
    } catch (error) {
      this.log("Operation status check failed", error.message);
      throw error;
    }
  }
  detectImageType(imageUrl) {
    if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return "url";
      } else if (imageUrl.startsWith("data:image")) {
        return "dataUri";
      } else {
        return "base64";
      }
    } else if (Buffer.isBuffer(imageUrl)) {
      return "buffer";
    }
    return "unknown";
  }
  async processImage(imageUrl) {
    const type = this.detectImageType(imageUrl);
    this.log("Processing image", {
      type: type
    });
    switch (type) {
      case "url": {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        const base64 = Buffer.from(response.data).toString("base64");
        const mimeType = response.headers["content-type"] || "image/jpeg";
        this.log("Image downloaded from URL", {
          mimeType: mimeType,
          size: base64.length
        });
        return {
          imageBase64: base64,
          mimeType: mimeType
        };
      }
      case "dataUri": {
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error("Invalid data URI format");
        }
        const mimeType = matches[1];
        const base64 = matches[2];
        this.log("Extracted from data URI", {
          mimeType: mimeType,
          size: base64.length
        });
        return {
          imageBase64: base64,
          mimeType: mimeType
        };
      }
      case "base64": {
        this.log("Using base64 string directly", {
          size: imageUrl.length
        });
        return {
          imageBase64: imageUrl,
          mimeType: "image/jpeg"
        };
      }
      case "buffer": {
        const base64 = imageUrl.toString("base64");
        this.log("Converted Buffer to base64", {
          size: base64.length
        });
        return {
          imageBase64: base64,
          mimeType: "image/jpeg"
        };
      }
      default:
        throw new Error("Unsupported image format");
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new VeoApi();
  try {
    let response;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'prompt' dan 'imageUrl' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'txt2img', 'txt2vid', 'img2vid' dan 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}