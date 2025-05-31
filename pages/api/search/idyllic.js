import axios from "axios";
class IdyllicSearchClient {
  constructor() {
    this.instance = axios.create();
  }
  async search({
    prompt = "Hello"
  }) {
    try {
      const res = await this.instance.get(`https://api.idyllic.app/explore/search?prompt=${prompt}`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          referer: "https://us.idyllic.app/"
        },
        decompress: true
      });
      return res.data;
    } catch (err) {
      console.error("Error searching idyllic:", err);
      throw err;
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
    const gemini = new IdyllicSearchClient();
    const response = await idyllicSearchClient.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}