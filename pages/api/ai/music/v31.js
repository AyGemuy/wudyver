import axios from "axios";
import https from "https";
class MusicGenerator {
  constructor() {
    this.baseUrl = "https://api.magicmusic.pro";
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 3e4,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true
      })
    });
    this.httpClient.interceptors.response.use(response => response, error => {
      const message = error.response?.data?.message || error.message;
      return Promise.reject(new Error(`API Error: ${message}`));
    });
  }
  async generate({
    prompt,
    make_instrumental = false,
    wait_audio = false,
    ...rest
  } = {}) {
    try {
      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        throw new Error("Prompt is required and must be a non-empty string");
      }
      const payload = {
        prompt: prompt.trim(),
        make_instrumental: make_instrumental,
        wait_audio: wait_audio,
        pro: true,
        ...rest
      };
      const response = await this.httpClient.post("/api/generate", payload);
      return response.data;
    } catch (error) {
      console.error("Song generation failed:", error.message);
      throw new Error(`Song generation failed: ${error.message}`);
    }
  }
  async status({
    task_id,
    ...rest
  } = {}) {
    try {
      if (!task_id || typeof task_id !== "string" || task_id.trim().length === 0) {
        throw new Error("Task ID is required and must be a non-empty string");
      }
      const response = await this.httpClient.get(`/api/get?ids=${task_id.trim()}`, {
        params: rest
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching song status:", error.message);
      throw new Error(`Error fetching song status: ${error.message}`);
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
  const api = new MusicGenerator();
  try {
    const validActions = ["generate", "status"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: `Action tidak valid: ${action}. Action yang didukung: ${validActions.join(", ")}.`
      });
    }
    let responseData;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi."
          });
        }
        responseData = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi."
          });
        }
        responseData = await api.status(params);
        break;
    }
    return res.status(200).json(responseData);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}