import axios from "axios";
class TikTokLiveCount {
  constructor() {
    this.baseUrl = "https://tiktoklivecount.com/search_profile";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://tiktoklivecount.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://tiktoklivecount.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search(username) {
    try {
      const formattedUsername = username.startsWith("@") ? username : `@${username}`;
      const response = await axios.post(this.baseUrl, {
        username: formattedUsername
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) {
    return res.status(400).json({
      error: "username is required"
    });
  }
  try {
    const downloader = new TikTokLiveCount();
    const result = await downloader.search(username);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}