import axios from "axios";
class ArtvyAPI {
  constructor() {
    this.baseUrl = "https://api.artvy.ai:444/image_search";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.artvy.ai/free/ai-art-generator"
    };
  }
  async searchImage(query) {
    if (!query) throw new Error('Paramenter "query" harus diisi.');
    const url = `${this.baseUrl}?query=${encodeURIComponent(query)}`;
    try {
      const response = await axios.get(url, {
        headers: this.defaultHeaders
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const artvy = new ArtvyAPI();
  if (!params.query) return res.status(400).json({
    error: 'Paramenter "query" wajib disertakan.'
  });
  try {
    const response = await artvy.searchImage(params.query);
    if (!response.success) return res.status(500).json({
      error: response.message
    });
    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}