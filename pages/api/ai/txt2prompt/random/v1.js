import axios from "axios";
class Lalals {
  constructor() {
    this.instance = axios.create();
  }
  async get() {
    try {
      const res = await this.instance.get("https://devapi.lalals.com/prompts/front/get-random-prompt", {
        headers: {
          accept: "application/json, text/plain, */*",
          "ngrok-skip-browser-warning": "yes",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          referer: "https://lalals-web-prod.vercel.app/voice/Michael-Jackson"
        }
      });
      return res.data;
    } catch (err) {
      console.error("Error fetching random prompt from Lalals:", err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  try {
    const lalals = new Lalals();
    const response = await lalals.get();
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}