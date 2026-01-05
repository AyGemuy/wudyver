import axios from "axios";
import crypto from "crypto";
class ViderAI {
  constructor() {
    this.cfg = {
      baseUrl: "https://api.vider.ai/api/freev1",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://vider.ai",
        referer: "https://vider.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      models: {
        t2i: "free-ai-image-generator",
        i2i: "free-ai-image-to-image-generator",
        t2v: "free-ai-video-generator",
        i2v: "free-ai-image-to-video-generator"
      }
    };
  }
  getExt(mime) {
    const map = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "video/mp4": "mp4"
    };
    return map[mime] || "jpg";
  }
  async upload(buffer, mimeType = "image/jpeg") {
    try {
      const ext = this.getExt(mimeType);
      const filename = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
      console.log(`[ViderAI] Requesting sign for: ${filename} (${mimeType})`);
      const signRes = await axios.post(`${this.cfg.baseUrl}/userFreeSignS3`, {
        filename: filename,
        tryNum: 0
      }, {
        headers: this.cfg.headers
      });
      const uploadData = signRes?.data?.data;
      if (!uploadData?.url) throw new Error("Failed to get upload signature");
      await axios.put(uploadData.url, buffer, {
        headers: {
          "Content-Type": mimeType
        }
      });
      console.log(`[ViderAI] Upload success: ${uploadData.pubUrl}`);
      return uploadData.pubUrl;
    } catch (e) {
      console.error(`[ViderAI] Upload Error: ${e.message}`);
      throw e;
    }
  }
  async resolveMedia(media) {
    if (!media) return "";
    let buffer;
    let mimeType = "image/jpeg";
    try {
      if (typeof media === "string" && (media.startsWith("http://") || media.startsWith("https://"))) {
        console.log(`[ViderAI] Resolving external URL...`);
        const res = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(res.data, "binary");
        mimeType = res.headers["content-type"] || mimeType;
      } else if (typeof media === "string" && media.includes("base64,")) {
        const match = media.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
          mimeType = match[1];
          buffer = Buffer.from(match[2], "base64");
        } else {
          buffer = Buffer.from(media, "base64");
        }
      } else if (Buffer.isBuffer(media)) {
        buffer = media;
      } else {
        return media;
      }
      return await this.upload(buffer, mimeType);
    } catch (e) {
      console.error(`[ViderAI] Resolve Media Error: ${e.message}`);
      return typeof media === "string" ? media : "";
    }
  }
  async generate({
    prompt,
    media,
    video = false,
    aspectRatio = 2,
    ...rest
  }) {
    try {
      console.log(`[ViderAI] Starting generation process...`);
      if (!prompt) throw new Error("Prompt is required");
      const imageUrl = await this.resolveMedia(media);
      const mode = video ? imageUrl ? "i2v" : "t2v" : imageUrl ? "i2i" : "t2i";
      const modelName = this.cfg.models[mode];
      console.log(`[ViderAI] Mode: ${mode.toUpperCase()} | URL: ${imageUrl || "none"}`);
      const payload = {
        params: {
          params: {
            model: modelName,
            prompt: prompt,
            aspectRatio: parseInt(aspectRatio),
            image: imageUrl || "",
            ...rest
          }
        }
      };
      const response = await axios.post(`${this.cfg.baseUrl}/task_create/${modelName}`, payload, {
        headers: this.cfg.headers
      });
      const result = response?.data;
      if (result?.code !== 0) throw new Error(result?.info || "API Error");
      const taskId = result?.data?.taskId || result?.data?.data?._id;
      return {
        status: "queued",
        mode: mode,
        task_id: taskId
      };
    } catch (e) {
      const msg = e.response?.data?.info || e.message;
      console.error(`[ViderAI] Generate Error: ${msg}`);
      return {
        status: "error",
        error: msg
      };
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) throw new Error("Task ID required");
      const response = await axios.get(`${this.cfg.baseUrl}/task_get/${task_id}`, {
        headers: this.cfg.headers
      });
      return response?.data;
    } catch (e) {
      return {
        status: "error",
        error: e.message
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
      error: "Parameter 'action' wajib diisi.",
      actions: ["generate", "status"]
    });
  }
  const api = new ViderAI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}