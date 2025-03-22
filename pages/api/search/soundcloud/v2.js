import axios from "axios";
class SoundCloudSearch {
  constructor() {
    this.baseUrl = "https://proxy.searchsoundcloud.com/tracks";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://searchsoundcloud.com/"
    };
  }
  async search(query, params = {}) {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        params: {
          q: query,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil data: ${error.response?.status} - ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      q,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!q) {
      return res.status(400).json({
        error: "Query parameter 'q' is required"
      });
    }
    const soundCloud = new SoundCloudSearch();
    const data = await soundCloud.search(q, params);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in API handler:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}