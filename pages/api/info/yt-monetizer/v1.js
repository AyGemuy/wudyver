import axios from "axios";
class YouTubeMonetizationChecker {
  constructor() {
    this.url = "https://timeskip.io/api/tools/youtube-monetization";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      Referer: "https://timeskip.io/tools/youtube-monetization-checker#monetization"
    };
  }
  async checkMonetization({
    url
  }) {
    try {
      const response = await axios.post(this.url, {
        url: url
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error checking monetization:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const checker = new YouTubeMonetizationChecker();
    const response = await checker.checkMonetization(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}