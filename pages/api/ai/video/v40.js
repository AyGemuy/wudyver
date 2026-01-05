import axios from "axios";
const CONFIG = {
  BASE_URL: "https://acc-swap-ai-production.up.railway.app",
  API_KEY: "fc16b5a4e7c8b9e2d3f6a1b8c9d0e2f4a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
  DEFAULT_MODEL: "veo-3.0-fast-generate-preview"
};
class VeoBackend {
  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.BASE_URL,
      timeout: 6e4,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": CONFIG.API_KEY
      }
    });
  }
  async generate({
    prompt,
    image = null,
    image_end: lastFrame = null,
    ...options
  }) {
    try {
      console.log(`\n[Veo::Generate] Requesting...`);
      const config = {
        aspectRatio: "16:9",
        modelName: CONFIG.DEFAULT_MODEL,
        ...options
      };
      const imgStart = await this._solveMedia(image, "Start");
      const imgEnd = await this._solveMedia(lastFrame, "End");
      const type = imgStart && imgEnd ? "FRAMES_TO_VIDEO" : "TEXT_TO_VIDEO";
      const payload = {
        prompt: prompt,
        type: type,
        aspectRatio: config.aspectRatio,
        outputsPerPrompt: 1,
        durationSeconds: 5,
        modelName: config.modelName,
        instances: [{
          prompt: prompt
        }],
        parameters: {
          aspectRatio: config.aspectRatio,
          sampleCount: 1
        },
        ...imgStart && imgEnd ? {
          image: imgStart,
          lastFrame: imgEnd
        } : {
          image: null,
          lastFrame: null
        }
      };
      const {
        data
      } = await this.client.post("/generate-video", payload);
      const operationName = data?.operation?.name || data?.name;
      if (!operationName) {
        throw new Error(`Server Response Invalid: ${JSON.stringify(data)}`);
      }
      console.log(`[Veo::Generate] Job Created: ...${operationName.slice(-10)}`);
      return {
        task_id: operationName,
        type: type,
        model: config.modelName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this._handleError("Generate", error);
    }
  }
  async status({
    task_id: operationName
  }) {
    try {
      if (!operationName) throw new Error("Operation Name Missing");
      const {
        data
      } = await this.client.post("/poll-operation", {
        operationName: operationName,
        modelName: CONFIG.DEFAULT_MODEL
      });
      const rootData = data.operation || {};
      const errorRaw = data.error || rootData.error || null;
      const isDone = data.done === true || rootData.done === true;
      const rawResponse = data.response || rootData.response || null;
      return {
        ...rawResponse,
        done: isDone,
        error: errorRaw
      };
    } catch (error) {
      console.error(`[Veo::Status] Glitch: ${error.message}`);
      return {
        result: null,
        done: false,
        error: "Network/Parsing Error"
      };
    }
  }
  async _solveMedia(input, label) {
    if (!input) return null;
    try {
      let base64Data = input;
      if (Buffer.isBuffer(input)) {
        base64Data = input.toString("base64");
      } else if (typeof input === "string" && input.startsWith("http")) {
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        base64Data = Buffer.from(data).toString("base64");
      } else if (typeof input === "string" && input.includes("base64,")) {
        base64Data = input.split("base64,")[1];
      }
      return {
        data: base64Data,
        mimeType: "image/png"
      };
    } catch (e) {
      console.warn(`[Media::${label}] Convert Failed: ${e.message}`);
      return null;
    }
  }
  _handleError(ctx, err) {
    const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`❌ [Veo::${ctx}] Error: ${msg}`);
    throw new Error(msg);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status"]
    });
  }
  const sora = new VeoBackend();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              prompt: "A futuristic car driving through neon city"
            }
          });
        }
        result = await sora.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              task_id: "xxxxxxxxx"
            }
          });
        }
        result = await sora.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}