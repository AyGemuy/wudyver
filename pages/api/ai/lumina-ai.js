import axios from "axios";
const config = {
  API_KEY: "Hanamon123",
  BASE_URL: "https://lumina-ai.fun",
  ENDPOINTS: {
    CHAT: "/api/gemini-chat",
    IMAGE: "/api/gemini-image",
    AUDIO: "/api/gemini-audio",
    VIDEO: "/api/gemini-video"
  },
  headers: () => ({
    "Content-Type": "application/json",
    "X-API-Key": config.API_KEY
  })
};
class AxiosClient {
  async generate({
    mode = "IMAGE",
    prompt,
    messages,
    ...rest
  }) {
    console.log(`Starting generation: mode=${mode}, prompt=${prompt}, messages=${messages?.length || 0}`);
    const endpoint = config.ENDPOINTS[mode.toUpperCase()] || config.ENDPOINTS.CHAT;
    const payload = messages?.length ? {
      messages: messages,
      ...rest
    } : {
      prompt: prompt,
      ...rest
    };
    console.log(`Requesting ${endpoint} with payload:`, payload);
    try {
      const res = await axios.post(`${config.BASE_URL}${endpoint}`, payload, {
        headers: config.headers()
      });
      console.log(`Response received for ${mode}:`, res?.data);
      return res?.data?.success ? res.data : {
        error: res?.data?.error || "No valid response received"
      };
    } catch (err) {
      console.error(`Generation failed for ${mode}:`, {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data
      });
      throw new Error(err?.response?.data?.message || err?.message || `Failed to generate ${mode.toLowerCase()}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new AxiosClient();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}