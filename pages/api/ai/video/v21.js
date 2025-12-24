import axios from "axios";
import https from "https";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class ByloVideo {
  constructor() {
    this.baseURL = "https://api.bylo.ai/aimodels/api/v1/ai";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://bylo.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://bylo.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      uniqueid: crypto.randomUUID().replace(/-/g, ""),
      verify: ";",
      ...SpoofHead()
    };
    this.agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("🚀 Starting video generation...");
    try {
      const isImg2Vid = imageUrl?.length > 0;
      const data = {
        prompt: prompt || "",
        channel: "SORA2",
        pageId: 536,
        source: "bylo.ai",
        watermarkFlag: false,
        privateFlag: false,
        isTemp: true,
        model: "sora_video2",
        videoType: isImg2Vid ? "image-to-video" : "text-to-video",
        aspectRatio: rest.aspectRatio || "portrait",
        ...isImg2Vid && {
          imageUrls: Array.isArray(imageUrl) ? imageUrl : [imageUrl]
        }
      };
      const url = `${this.baseURL}/video/create`;
      console.log("📤 Sending request to:", url);
      const {
        data: res
      } = await axios.post(url, data, {
        headers: this.headers,
        httpsAgent: this.agent
      });
      console.log("✅ Generation success:", res.data || "task_id received");
      return res.data || "";
    } catch (err) {
      console.error("❌ Generation failed:", err.response?.data || err.message);
      throw err;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    console.log("⏳ Checking status for:", task_id);
    try {
      const url = `${this.baseURL}/${task_id}?channel=SORA2`;
      console.log("📡 Status URL:", url);
      const {
        data: res
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        httpsAgent: this.agent
      });
      console.log("📊 Status response:", res);
      return res;
    } catch (err) {
      console.error("❌ Status check failed:", err.response?.data || err.message);
      throw err;
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
  const api = new ByloVideo();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'generate'."
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