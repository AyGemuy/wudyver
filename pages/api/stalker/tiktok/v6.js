import axios from "axios";
class TikTokCalculator {
  constructor() {
    this.baseUrl = "https://tikcalculator.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      referer: "https://tikcalculator.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.cookie = "";
  }
  async getCookies() {
    try {
      const {
        headers
      } = await axios.get(this.baseUrl, {
        headers: this.headers
      });
      const cookie = headers["set-cookie"]?.find(c => c.includes("session_data"))?.split(";")[0];
      if (cookie) this.cookie = cookie;
    } catch (error) {
      console.error("Error getting cookies:", error);
    }
  }
  async tiktokCalculator(username) {
    try {
      await this.getCookies();
      const {
        data
      } = await axios.get(`${this.baseUrl}/result`, {
        params: {
          username: username
        },
        headers: {
          ...this.headers,
          cookie: this.cookie
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching TikTok data:", error);
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
    const calculator = new TikTokCalculator();
    const result = await calculator.tiktokCalculator(username);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}