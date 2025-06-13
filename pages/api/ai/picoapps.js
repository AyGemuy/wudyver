import axios from "axios";
class PicoAppsAPI {
  constructor() {
    this.baseURL = "https://backend.buildpicoapps.com/aero/run/llm-api";
    this.pk = "v1-Z0FBQUFBQm5sUjNYTHFZaGJiYnV1Si1FLTQ4WnEwbGlKUVZablk2bU5jVlB4Q2NjcEdybFVDWnFrRlA4XzJwbDNBWGRId0ZTZGgwdTJMZnhEY1lRdmVWU0MtQ09HZElNLVNabEVBQVo5NktaQVhQeE5kVWtJU2c9";
  }
  async sendPrompt(prompt) {
    try {
      const response = await axios.post(`${this.baseURL}?pk=${this.pk}`, {
        prompt: prompt
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
          Referer: "https://a.picoapps.xyz/important-identify"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt dan character wajib diberikan."
    });
  }
  const pico = new PicoAppsAPI();
  try {
    const result = await pico.sendPrompt(prompt);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error while calling LLM API:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}