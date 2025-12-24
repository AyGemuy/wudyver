import axios from "axios";
import FormData from "form-data";
class EarthZoomOutAPI {
  constructor() {
    this.baseURL = "https://aiearthzoomout.space/api";
    this.commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      origin: "https://aiearthzoomout.space",
      referer: "https://aiearthzoomout.space/"
    };
  }
  async upload(imageBuffer, filename = "image.webp") {
    try {
      console.log("Starting upload process...");
      const formData = new FormData();
      formData.append("file", imageBuffer, {
        filename: filename,
        contentType: "image/webp"
      });
      const headers = {
        ...this.commonHeaders,
        ...formData.getHeaders()
      };
      console.log("Uploading image to server...");
      const response = await axios.post(`${this.baseURL}/upload`, formData, {
        headers: headers,
        timeout: 3e4
      });
      console.log("Upload successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Upload failed:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
  async create({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Creating new task with image URL:", imageUrl);
      console.log("Downloading image from URL...");
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 3e4
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      const filename = imageUrl.split("/").pop() || "image.webp";
      console.log("Image downloaded successfully, size:", imageBuffer.length, "bytes");
      const uploadResponse = await this.upload(imageBuffer, filename);
      const generateData = {
        uploadId: uploadResponse.uploadId || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quality: rest.quality || "1080p",
        zoomLevel: rest.zoomLevel || 15,
        duration: rest.duration || 6
      };
      console.log("Generating video with parameters:", generateData);
      const generateHeaders = {
        ...this.commonHeaders,
        "content-type": "application/json"
      };
      const generateResponse = await axios.post(`${this.baseURL}/generate`, generateData, {
        headers: generateHeaders,
        timeout: 6e4
      });
      console.log("Video generation started successfully:", generateResponse.data);
      return generateResponse.data;
    } catch (error) {
      console.error("Create task failed:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Create failed: ${error.message}`);
    }
  }
  async status({
    task_id
  }) {
    try {
      console.log("Checking status for task ID:", task_id);
      const response = await axios.get(`${this.baseURL}/status/${task_id}`, {
        headers: this.commonHeaders,
        timeout: 15e3
      });
      console.log("Status check successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Status check failed:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Status check failed: ${error.message}`);
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
  const api = new EarthZoomOutAPI();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl are required for create."
          });
        }
        response = await api.create(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'create', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}