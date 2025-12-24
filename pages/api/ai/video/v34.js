import axios from "axios";
import PROMPT from "@/configs/ai-prompt";
class VideoApi {
  constructor(configuration = {}) {
    const defaultBaseUrls = ["https://us-central1-speed-app-a69c3.cloudfunctions.net", "https://us-central1-conquer-apps-2ad61.cloudfunctions.net", "https://us-central1-conquer-apps-v1.cloudfunctions.net"];
    this.config = {
      baseUrls: configuration.baseUrls || defaultBaseUrls,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
        "Access-Control-Allow-Credentials": "true"
      },
      timeout: 15e3,
      ...configuration
    };
  }
  async makeRequest({
    method = "get",
    endpoint,
    data,
    params
  } = {}) {
    const {
      baseUrls,
      headers,
      timeout
    } = this.config;
    let lastError = null;
    for (let index = 0; index < baseUrls.length; index++) {
      const baseUrl = baseUrls[index];
      const fullUrl = endpoint ? `${baseUrl}/${endpoint}` : baseUrl;
      try {
        const dataLog = data ? ` | data: ${JSON.stringify(data).slice(0, 200)}${JSON.stringify(data).length > 200 ? "..." : ""}` : "";
        const paramsLog = params ? ` | params: ${JSON.stringify(params)}` : "";
        console.log(`[VideoApi] Request → [${index + 1}/${baseUrls.length}] ${method.toUpperCase()} ${fullUrl}${dataLog}${paramsLog}`);
        const axiosInstance = axios.create({
          baseURL: baseUrl,
          headers: headers,
          timeout: timeout
        });
        const response = await axiosInstance({
          method: method,
          url: endpoint,
          data: data,
          params: params
        });
        console.log(`[VideoApi] Success ← [${index + 1}/${baseUrls.length}] ${response.status}`, JSON.stringify(response.data, null, 2));
        return response.data ?? {};
      } catch (error) {
        lastError = error;
        const status = error.response?.status || error.code || "NET";
        const errorDetail = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message || "Unknown error";
        console.log(`[VideoApi] Failed → [${index + 1}/${baseUrls.length}] ${status}`, errorDetail);
        if (index === baseUrls.length - 1) {
          throw error.response?.data || error;
        }
      }
    }
    throw lastError || new Error("No base URLs configured");
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    model = "gen3a_turbo",
    seed = 0,
    watermark = false,
    duration = 5,
    ratio = "1280:768",
    ...options
  } = {}) {
    try {
      const payload = {
        promptImage: imageUrl || "",
        promptText: prompt || "",
        model: model,
        seed: seed,
        watermark: watermark,
        duration: duration,
        ratio: ratio,
        ...options
      };
      return await this.makeRequest({
        method: "post",
        endpoint: "runway_ai/image.video.gen.live",
        data: payload
      });
    } catch (error) {
      console.error("[VideoApi] generate failed:", error);
      throw error;
    }
  }
  async status({
    task_id: taskId,
    ...options
  } = {}) {
    try {
      if (!taskId) throw new Error("taskId is required for status check");
      return await this.makeRequest({
        method: "get",
        endpoint: "runway_ai/image.video.fetch.live",
        params: {
          taskId: taskId,
          ...options
        }
      });
    } catch (error) {
      console.error("[VideoApi] status failed:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    temperature = .7,
    topP = 1,
    n = 1,
    model = "gpt-4o-mini",
    ...options
  } = {}) {
    try {
      const payload = {
        prompt: prompt || "",
        temperature: temperature,
        topP: topP,
        n: n,
        model: model,
        ...options
      };
      return await this.makeRequest({
        method: "post",
        endpoint: "open_ai/api.gen.text",
        data: payload
      });
    } catch (error) {
      console.error("[VideoApi] chat failed:", error);
      throw error;
    }
  }
  async pexels({
    query,
    orientation = "all",
    perPage = 15
  } = {}) {
    try {
      if (!query) throw new Error("Query is required for video search");
      return await this.makeRequest({
        endpoint: "pexel_ai/video.search.live",
        params: {
          query: query,
          orientation: orientation,
          per_page: perPage
        }
      });
    } catch (error) {
      console.error("[VideoApi] pexels failed:", error);
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new VideoApi();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.imageUrl) {
          console.log(`[AUTO] 'imageUrl' kosong pada action 'generate'.`);
          return res.status(400).json({
            message: "Parameter 'imageUrl' diperlukan untuk 'generate'.",
            tip: "Gunakan prompt yang jelas untuk menghasilkan video.",
            example: "Contoh: action=generate&imageUrl=https://example.com&prompt=a cute cat walking"
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib untuk status."
          });
        }
        response = await api.status(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib untuk chat."
          });
        }
        response = await api.chat(params);
        break;
      case "pexels":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib untuk pexels."
          });
        }
        response = await api.pexels(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: generate, status, chat, pexels`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error.message || error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}