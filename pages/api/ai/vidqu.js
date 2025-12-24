import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class VidQuAI {
  constructor() {
    this.baseURL = "https://tool-api.vidqu.ai";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://www.vidqu.ai",
      priority: "u=1, i",
      referer: "https://www.vidqu.ai/",
      "request-origin": "vidqu",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-device-id": this.genId(),
      "x-task-version": "2.0.0",
      ...SpoofHead()
    };
  }
  genId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  async getUploadUrl(fileName) {
    try {
      console.log("Requesting upload URL for file:", fileName);
      const response = await axios.post(`${this.baseURL}/ai/source/temp-upload-url`, {
        file_name: fileName
      }, {
        headers: {
          ...this.headers,
          authorization: "Bearer null"
        }
      });
      console.log("Upload URL response:", response?.data);
      return response?.data?.data;
    } catch (error) {
      console.error("Error getting upload URL:", error?.response?.data || error.message);
      throw error;
    }
  }
  async uploadFile(uploadUrl, fileBuffer, contentType = "image/webp") {
    try {
      console.log("Uploading file to:", uploadUrl);
      const response = await axios.put(uploadUrl, fileBuffer, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          Connection: "keep-alive",
          "Content-Type": contentType,
          Origin: "https://www.vidqu.ai",
          Referer: "https://www.vidqu.ai/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "X-TASK-VERSION": "2.0.0",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      console.log("File upload successful");
      return true;
    } catch (error) {
      console.error("Error uploading file:", error?.response?.data || error.message);
      throw error;
    }
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    try {
      console.log("Starting text to image generation with prompt:", prompt);
      const headers = {
        ...this.headers,
        "request-language": "en",
        "x-from-page": "ai_image_generator"
      };
      const payload = {
        modelId: 31,
        loraId: 0,
        quantity: 1,
        mode: 4,
        width: 1536,
        height: 2048,
        display: true,
        prompt: prompt,
        negative_prompt: "drawing, render, painting",
        ...rest
      };
      const response = await axios.post(`${this.baseURL}/generate/image/create-task`, payload, {
        headers: headers
      });
      console.log("Text to image task created:", response?.data);
      const taskId = response?.data?.data?.task_id;
      if (taskId) {
        return {
          task_id: `image-${taskId}`,
          ...response?.data
        };
      }
      return response?.data;
    } catch (error) {
      console.error("Error in txt2img:", error?.response?.data || error.message);
      throw error;
    }
  }
  async img2img({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Starting image to image generation with prompt:", prompt);
      const uploadData = await this.getUploadUrl("input_image.jpg");
      if (!uploadData?.upload_url) {
        throw new Error("Failed to get upload URL");
      }
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      await this.uploadFile(uploadData.upload_url, imageBuffer, "image/jpeg");
      const headers = {
        ...this.headers,
        "request-language": "en",
        "x-from-page": "ai_image_generator"
      };
      const payload = {
        modelId: 112,
        loraId: 0,
        quantity: 1,
        mode: 4,
        width: 1536,
        height: 2048,
        display: true,
        prompt: prompt,
        negative_prompt: "",
        reference_images: uploadData.key,
        ...rest
      };
      const response = await axios.post(`${this.baseURL}/generate/image/create-task`, payload, {
        headers: headers
      });
      console.log("Image to image task created:", response?.data);
      const taskId = response?.data?.data?.task_id;
      if (taskId) {
        return {
          task_id: `image-${taskId}`,
          ...response?.data
        };
      }
      return response?.data;
    } catch (error) {
      console.error("Error in img2img:", error?.response?.data || error.message);
      throw error;
    }
  }
  async img2vid({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Starting image to video generation with prompt:", prompt);
      const uploadData = await this.getUploadUrl("input_image.webp");
      if (!uploadData?.upload_url) {
        throw new Error("Failed to get upload URL");
      }
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      await this.uploadFile(uploadData.upload_url, imageBuffer, "image/webp");
      const headers = {
        ...this.headers,
        "request-language": "en",
        "x-from-page": "image_to_video"
      };
      const payload = {
        model: "wan2_1",
        image_id: 0,
        key: uploadData.key,
        quantity: 1,
        duration: "5",
        width: 1100,
        height: 733,
        display: true,
        prompt: prompt,
        negative_prompt: "",
        remix_task_id: 0,
        ...rest
      };
      const response = await axios.post(`${this.baseURL}/generate/video/create-task`, payload, {
        headers: headers
      });
      console.log("Image to video task created:", response?.data);
      const taskId = response?.data?.data?.task_id;
      if (taskId) {
        return {
          task_id: `video-${taskId}`,
          ...response?.data
        };
      }
      return response?.data;
    } catch (error) {
      console.error("Error in img2vid:", error?.response?.data || error.message);
      throw error;
    }
  }
  async status({
    task_id: taskId
  }) {
    try {
      console.log("Checking status for task:", taskId);
      const [type, actualTaskId] = taskId.split("-");
      if (!type || !actualTaskId) {
        throw new Error("Invalid task_id format. Expected format: type-taskid");
      }
      const endpoint = type === "image" ? `${this.baseURL}/generate/image/task-state?task_id=${actualTaskId}` : `${this.baseURL}/generate/video/task-state?task_id=${actualTaskId}`;
      const headers = {
        ...this.headers,
        "request-language": "en"
      };
      const response = await axios.get(endpoint, {
        headers: headers
      });
      console.log("Task status:", response?.data);
      return {
        task_id: taskId,
        ...response?.data
      };
    } catch (error) {
      console.error("Error checking task status:", error?.response?.data || error.message);
      throw error;
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
        action: "txt2img | img2img | img2vid | status"
      }
    });
  }
  const generator = new VidQuAI();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await generator.txt2img(params);
        break;
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: prompt, imageUrl (required for ${action})`
          });
        }
        result = await generator.img2img(params);
        break;
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: prompt, imageUrl (required for ${action})`
          });
        }
        result = await generator.img2vid(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required fields: task_id (required for ${action})`
          });
        }
        result = await generator.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img | img2vid | status`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}