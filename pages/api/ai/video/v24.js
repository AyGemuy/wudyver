import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class Veo31 {
  constructor(baseURL = "https://veo31.ai/api") {
    this.base = baseURL;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://veo31.ai",
      referer: "https://veo31.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async upload(imageUrl) {
    try {
      console.log("📤 Uploading image...");
      const form = new FormData();
      const isBuffer = Buffer.isBuffer(imageUrl);
      const isBase64 = typeof imageUrl === "string" && imageUrl?.startsWith("data:");
      const isUrl = typeof imageUrl === "string" && imageUrl?.startsWith("http");
      if (isBuffer) {
        form.append("file", imageUrl, "image.jpg");
      } else if (isBase64) {
        const buf = Buffer.from(imageUrl.split(",")[1] || imageUrl, "base64");
        form.append("file", buf, "image.jpg");
      } else if (isUrl) {
        const {
          data
        } = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        form.append("file", Buffer.from(data), "image.jpg");
      } else {
        throw new Error("Invalid image format");
      }
      const {
        data
      } = await axios.post(`${this.base}/upload/image`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      console.log("✅ Upload success:", data?.fileName);
      return data;
    } catch (err) {
      console.error("❌ Upload failed:", err?.message);
      throw err;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      const upload = imageUrl ? await this.upload(imageUrl) : null;
      const fileName = upload?.fileName || null;
      console.log(`🎬 Generating ${fileName ? "image-to-video" : "text-to-video"}...`);
      const body = {
        prompt: prompt,
        aspectRatio: rest?.aspectRatio || "16:9",
        videoId: rest?.videoId || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      const {
        data
      } = await axios.post(`${this.base}/generate/stream`, body, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      console.log("✅ Generation started:", data?.taskId);
      return data;
    } catch (err) {
      console.error("❌ Generation failed:", err?.message);
      throw err;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    try {
      const videoId = rest?.videoId || task_id;
      console.log("🔍 Checking status:", videoId);
      const {
        data
      } = await axios.get(`${this.base}/webhook`, {
        params: {
          videoId: videoId
        },
        headers: this.headers
      });
      console.log(`📊 Status: ${data?.status} (${data?.progress || 0}%)`);
      return data;
    } catch (err) {
      console.error("❌ Status check failed:", err?.message);
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
      error: "Action is required."
    });
  }
  const api = new Veo31();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for generate."
          });
        }
        response = await api.generate(params);
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
          error: `Invalid action: ${action}. Supported actions are 'generate', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}