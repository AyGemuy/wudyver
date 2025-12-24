import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class PixverseAPI {
  constructor(config = {}) {
    this.baseURL = config.baseURL || "https://ai-sora2studio-production.up.railway.app";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: this.baseURL,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseURL}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...config.headers,
      ...SpoofHead()
    };
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: this.headers
    });
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    const type = imageUrl ? "image-to-video" : "text-to-video";
    console.log(`[Generate] Starting ${type} generation...`);
    try {
      const payload = {
        videoPrompt: prompt,
        videoAspectRatio: rest?.aspectRatio || rest?.videoAspectRatio || "16:9",
        videoDuration: rest?.duration || rest?.videoDuration || 8,
        videoQuality: rest?.quality || rest?.videoQuality || "360p",
        videoModel: rest?.model || rest?.videoModel || "v4.5",
        videoImageUrl: imageUrl || "",
        videoPublic: rest?.isPublic ?? rest?.videoPublic ?? false
      };
      console.log("[Generate] Sending request with payload:", JSON.stringify(payload, null, 2));
      const {
        data
      } = await this.client.post("/api/pixverse-token/gen", payload);
      console.log("[Generate] Success:", data);
      return data;
    } catch (err) {
      console.error("[Generate] Error:", err?.response?.data || err?.message || err);
      return {
        success: false,
        error: err?.response?.data?.message || err?.message || "Generation failed",
        details: err?.response?.data || null
      };
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    console.log(`[Status] Checking task: ${task_id}`);
    try {
      const payload = {
        taskId: task_id,
        videoPublic: rest?.isPublic ?? rest?.videoPublic ?? false,
        videoQuality: rest?.quality || rest?.videoQuality || "360p",
        videoAspectRatio: rest?.aspectRatio || rest?.videoAspectRatio || "16:9"
      };
      console.log("[Status] Sending request...");
      const {
        data
      } = await this.client.post("/api/pixverse-token/get", payload);
      console.log("[Status] Response:", data);
      return data;
    } catch (err) {
      console.error("[Status] Error:", err?.response?.data || err?.message || err);
      return {
        success: false,
        error: err?.response?.data?.message || err?.message || "Status check failed",
        details: err?.response?.data || null
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new PixverseAPI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.generate(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate' dan 'status'.`
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