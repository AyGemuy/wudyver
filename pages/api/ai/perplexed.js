import axios from "axios";
class PerplexityAPI {
  constructor(config = {}) {
    this.baseURL = config.baseURL || "https://d21l5c617zttgr.cloudfront.net";
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 1e4,
      headers: {
        origin: this.baseURL,
        referer: `${this.baseURL}/`,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...config.headers
      }
    });
  }
  async chat({
    prompt,
    ...rest
  }) {
    try {
      console.log("Processing...", prompt?.substring(0, 30));
      if (!prompt?.trim()) throw new Error("Prompt required");
      const {
        data
      } = await this.client.post("/stream_search", {
        user_prompt: prompt,
        ...rest
      });
      const steps = (data || "").split("[/PERPLEXED-SEPARATOR]").map(part => part?.trim() ? JSON.parse(part) : null).filter(Boolean);
      const last = steps[steps.length - 1] || {};
      return {
        answer: last?.answer || "No answer",
        sources: last?.websearch_docs || [],
        steps: steps.length,
        stages: steps.map(s => s?.stage)
      };
    } catch (error) {
      console.log("Error:", error?.message);
      throw new Error(error?.message || "Failed");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new PerplexityAPI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}