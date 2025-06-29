import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class GhibliStyle {
  constructor() {
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload?host=Catbox`;
    this.baseUrl = "https://ghiblichatgpt.org";
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.randomID(8),
      ...extra
    };
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
      throw new Error("Error retrieving image data: " + (error.message || error));
    }
  }
  async img2img({
    imageUrl
  }) {
    try {
      const {
        buffer,
        contentType,
        filename
      } = await this.getData(imageUrl);
      const formData = new FormData();
      formData.set("file", new Blob([buffer], {
        type: contentType
      }), filename);
      const uploadResponse = await axios.post(`${this.baseUrl}/api/upload`, formData, {
        headers: this.buildHeaders({
          ...formData.headers
        })
      });
      if (uploadResponse.data.code !== 200) {
        throw new Error("Error uploading image");
      }
      const taskId = uploadResponse.data.data.taskId;
      console.log("Task ID:", taskId);
      const timeout = 36e5;
      const startTime = Date.now();
      let taskStatus = "PENDING";
      while (taskStatus !== "SUCCESS") {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > timeout) {
          throw new Error("Polling timed out after 1 hour");
        }
        const statusResponse = await axios.get(`${this.baseUrl}/api/check-status?taskId=${taskId}`, {
          headers: this.buildHeaders({
            accept: "application/json"
          })
        });
        const status = statusResponse.data.data.status;
        const progress = statusResponse.data.data.progress || "0.00";
        console.log(`Task ID: ${taskId}, Status: ${status}, Progress: ${progress}%`);
        if (status === "SUCCESS") {
          taskStatus = "SUCCESS";
        } else {
          await new Promise(resolve => setTimeout(resolve, 3e3));
        }
      }
      const resultResponse = await axios.get(`${this.baseUrl}/api/get-result?taskId=${taskId}`, {
        headers: this.buildHeaders({
          accept: "application/json"
        })
      });
      console.log(`Task ID: ${taskId}, Status: ${resultResponse.data.data.status}`);
      return resultResponse.data.data;
    } catch (error) {
      throw new Error("Error generating image: " + (error.message || error));
    }
  }
  async txt2img({
    prompt,
    style = "ghibli"
  }) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate-image`, {
        prompt: prompt,
        style: style
      }, {
        headers: this.buildHeaders({
          accept: "application/json"
        })
      });
      if (response.data.imageData) {
        const base64Image = response.data.imageData;
        const buffer = Buffer.from(base64Image, "base64");
        const uploadResult = await this.uploadImage(buffer);
        return uploadResult;
      } else {
        throw new Error("Image generation failed or no image data found.");
      }
    } catch (error) {
      throw new Error("Error generating image: " + error.message);
    }
  }
  async uploadImage(buffer, mimeType = "image/png") {
    try {
      const base64Image = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      const requestData = {
        file: dataUri
      };
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, requestData);
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