import axios from "axios";
class TikTokZillaAPI {
  constructor() {
    this.baseURL = "https://api.tiktokzilla.com/v1";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://tiktokzilla.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://tiktokzilla.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    username,
    force = true
  }) {
    try {
      const response = await axios.post(`${this.baseURL}/videos`, {
        username: username,
        force: force
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mencari video:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query is required"
    });
  }
  try {
    const tiktokApi = new TikTokZillaAPI();
    const result = await tiktokApi.search(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}