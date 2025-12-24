import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class MakeFilm {
  constructor() {
    this.baseURL = "https://makefilm.ai/api";
  }
  getDynamicHeaders(isFormData = false) {
    const dynamicHeaders = {
      accept: "application/json, text/plain, */*",
      origin: "https://makefilm.ai",
      referer: "https://makefilm.ai/features/video-generator",
      "accept-language": "id-ID,id;q=0.9",
      ...SpoofHead()
    };
    if (!isFormData) {
      dynamicHeaders["content-type"] = "application/json";
    }
    return dynamicHeaders;
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
  async img2vid({
    imageUrl,
    prompt,
    width = 768,
    height = 768,
    model = "v3",
    isFast = false,
    isHighQuality = false,
    is10s = false,
    isCameraFixed = false,
    enhancePrompt = true
  }) {
    try {
      if (!imageUrl || !prompt) throw new Error("imageUrl dan prompt wajib diisi");
      const form = new FormData();
      const imgRes = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const mime = imgRes.headers["content-type"] || "image/png";
      const ext = mime.split("/")[1] || "png";
      const imageBlob = new Blob([imgRes.data], {
        type: mime
      });
      form.append("image", imageBlob, `image.${ext}`);
      form.append("width", width);
      form.append("height", height);
      form.append("prompt", prompt);
      form.append("model", model);
      form.append("isFast", isFast);
      form.append("isHighQuality", isHighQuality);
      form.append("is10s", is10s);
      form.append("isCameraFixed", isCameraFixed);
      form.append("enhancePrompt", enhancePrompt);
      const requestHeaders = {
        ...this.getDynamicHeaders(true),
        ...form.headers
      };
      const {
        data
      } = await axios.post(`${this.baseURL}/process-video-generation`, form, {
        headers: requestHeaders
      });
      if (data?.content?.mid) {
        return {
          task_id: await this.enc({
            mid: data.content.mid
          }),
          ...data
        };
      }
      return data;
    } catch (err) {
      console.error("Error in img2vid:", err.message);
      return {
        error: err.message
      };
    }
  }
  async txt2vid({
    prompt,
    width = 768,
    height = 768,
    model = "v3",
    isFast = false,
    isHighQuality = false,
    is10s = false,
    isCameraFixed = false,
    enhancePrompt = true
  }) {
    try {
      if (!prompt) throw new Error("prompt wajib diisi");
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("width", width);
      form.append("height", height);
      form.append("model", model);
      form.append("isFast", isFast);
      form.append("isHighQuality", isHighQuality);
      form.append("is10s", is10s);
      form.append("isCameraFixed", isCameraFixed);
      form.append("enhancePrompt", enhancePrompt);
      const requestHeaders = {
        ...this.getDynamicHeaders(true),
        ...form.headers
      };
      const {
        data
      } = await axios.post(`${this.baseURL}/process-video-generation`, form, {
        headers: requestHeaders
      });
      if (data?.content?.mid) {
        return {
          task_id: await this.enc({
            mid: data.content.mid
          }),
          ...data
        };
      }
      return data;
    } catch (err) {
      console.error("Error in txt2vid:", err.message);
      return {
        error: err.message
      };
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) throw new Error("task_id wajib diisi");
      const {
        mid
      } = await this.dec(task_id);
      const requestHeaders = this.getDynamicHeaders(false);
      const {
        data
      } = await axios.post(`${this.baseURL}/get-processed-video-generation`, {
        mid: mid
      }, {
        headers: requestHeaders
      });
      return data;
    } catch (err) {
      console.error("Error in status:", err.message);
      return {
        error: err.message
      };
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
  const ai = new MakeFilm();
  try {
    switch (action) {
      case "txt2vid": {
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'txt2vid'."
          });
        }
        const result = await ai.txt2vid(params);
        return res.status(200).json(result);
      }
      case "img2vid": {
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: !params.prompt ? "Prompt is required for 'img2vid'." : "imageUrl is required for 'img2vid'."
          });
        }
        const result = await ai.img2vid(params);
        return res.status(200).json(result);
      }
      case "status": {
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status'."
          });
        }
        const result = await ai.status(params);
        return res.status(200).json(result);
      }
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions: 'status', 'txt2vid', 'img2vid'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}