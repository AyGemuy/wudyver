import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class LinangData {
  constructor(params = {}) {
    this.client = axios.create({
      headers: {
        Accept: "text/plain, */*; q=0.01",
        "Accept-Language": "id-ID,id;q=0.9",
        "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryKzDmH3s0o3ri2sdA",
        Cookie: "PHPSESSID=5c1c871bd25a60cb62f08616aab420b7; FCNEC=%5B%5B%22AKsRol-F4kV78-Ei6I5NUAZASUKiilObtf1I4Sg6H8UVHebtGoWV3VwVvhHHCMaru5nEPgE_AGWGspGTnhtWERXTCWGBk30p2dh4dhUgVT_lAcGayF_scpFZGsV4pvdqLLQBrPVMCoPhA5Gr-Rb-guPP-VI-oPdMgg%3D%3D%22%5D%5D",
        Origin: "https://linangdata.com",
        Priority: "u=1, i",
        Referer: "https://linangdata.com/text-to-image-ai/",
        "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        ...params.headers
      },
      baseURL: params.baseURL || "https://linangdata.com"
    });
  }
  async setFormData(formData = {}) {
    const form = new FormData();
    Object.keys(formData).forEach(key => {
      form.append(key, formData[key]);
    });
    return form;
  }
  async getImage(imageUrl) {
    try {
      const response = await this.client.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"];
      const mimeType = contentType.split(";")[0];
      const ext = mimeType.split("/")[1];
      const blob = new Blob([buffer], {
        type: mimeType
      });
      return {
        ext: ext,
        blob: blob
      };
    } catch (error) {
      console.error("Error getting image metadata and blob:", error);
      return null;
    }
  }
  async generateImage(params = {}) {
    const form = await this.setFormData({
      prompt: params.prompt || "men in forest",
      negativePrompt: params.negativePrompt || "no blur",
      preset: params.preset || "anime",
      orientation: params.orientation || "portrait",
      seed: params.seed || "",
      ...params.formData
    });
    try {
      const response = await this.client.post("text-to-image-ai/stablefusion-v2.php", form, {
        headers: form.headers
      });
      return Buffer.from(response.data.image, "base64");
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  }
  async sendMessageToGPT(params = {}) {
    const form = await this.setFormData({
      question: params.prompt || "yolo",
      messages: params.messages || JSON.stringify([{
        role: "system",
        content: "You are a helpful assistant."
      }, {
        role: "user",
        content: params.prompt || "yolo"
      }]),
      model: params.model || "llama3.2:latest",
      ...params.formData
    });
    try {
      const response = await this.client.post("chat-gpt/completions-llama3-stream.php", form, {
        headers: form.headers
      });
      const result = response.data.split("\n").filter(v => v.startsWith("{")).map(v => {
        try {
          const parsed = JSON.parse(v);
          return parsed?.message?.content || "";
        } catch (e) {
          return "";
        }
      }).join("") || null;
      return result;
    } catch (error) {
      console.error("Error sending message to GPT:", error);
      return null;
    }
  }
  async restorePhoto(params = {}) {
    const {
      ext,
      blob
    } = await this.getImage(params.imageUrl);
    const form = await this.setFormData({
      image: blob,
      upsample: params.upsample || "true",
      ...params.formData
    });
    try {
      const timestamp = new Date().getTime();
      const url = `photo-restoration/restorePhoto.php?uuid=${timestamp}&name=${timestamp}.${ext}`;
      const response = await this.client.post(url, form, {
        headers: form.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error restoring photo:", error);
      return null;
    }
  }
  async removeBackground(params = {}) {
    const {
      ext,
      blob
    } = await this.getImage(params.imageUrl);
    const form = await this.setFormData({
      image: blob,
      ...params.formData
    });
    try {
      const response = await this.client.post("background-remover/removePhotoBackground.php", form, {
        headers: form.headers
      });
      return Buffer.from(response.data.image, "base64");
    } catch (error) {
      console.error("Error removing background:", error);
      return null;
    }
  }
  async reviveColor(params = {}) {
    const {
      ext,
      blob
    } = await this.getImage(params.imageUrl);
    const form = await this.setFormData({
      image: blob,
      ...params.formData
    });
    try {
      const response = await this.client.post("ColorReviveAI/deoldify.php", form, {
        headers: form.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error reviving color:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  const linangData = new LinangData();
  let imageBuffer;
  try {
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required"
          });
        }
        imageBuffer = await linangData.generateImage(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Failed to generate image"
          });
        }
        break;
      case "chatgpt":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required"
          });
        }
        const gptResponse = await linangData.sendMessageToGPT(params);
        if (gptResponse) {
          return res.status(200).json({
            result: gptResponse
          });
        } else {
          res.status(500).json({
            error: "Failed to process GPT request"
          });
        }
        break;
      case "restore":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl is required"
          });
        }
        imageBuffer = await linangData.restorePhoto(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Failed to restore image"
          });
        }
        break;
      case "remove":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl is required"
          });
        }
        imageBuffer = await linangData.removeBackground(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Failed to remove image"
          });
        }
        break;
      case "revive":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl is required"
          });
        }
        imageBuffer = await linangData.reviveColor(params);
        if (imageBuffer) {
          res.setHeader("Content-Type", "image/png");
          res.send(imageBuffer);
        } else {
          res.status(500).json({
            error: "Failed to revive image"
          });
        }
        break;
      default:
        res.status(400).json({
          error: "Unknown action"
        });
        break;
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}