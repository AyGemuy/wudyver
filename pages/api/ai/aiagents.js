import axios from "axios";
const BASE = "https://aiagents.onrender.com/api-askLLM";
const HEAD = {
  Authorization: "Bearer xyz",
  Accept: "application/json"
};
class AIClient {
  async chat({
    prompt,
    system,
    ...rest
  }) {
    const p = prompt ?? "";
    const d = system ?? rest.description ?? "";
    const u = `${BASE}?prompt=${encodeURIComponent(p)}&description=${encodeURIComponent(d)}`;
    console.log("→ start", {
      p: p,
      d: d
    });
    try {
      const {
        data
      } = await axios.get(u, {
        headers: HEAD
      });
      console.log("← done", data);
      return data;
    } catch (e) {
      console.error("✗ err", e?.response?.data ?? e.message);
      throw e;
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
  const api = new AIClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}