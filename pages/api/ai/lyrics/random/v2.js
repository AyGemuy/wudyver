import axios from "axios";
class AimakeSong {
  constructor() {
    this.instance = axios.create({
      baseURL: "https://www.aimakesong.com/api/music",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.aimakesong.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.aimakesong.com/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async generateSong({
    description = "dreamy",
    lang = "en"
  }) {
    try {
      const res = await this.instance.post("/generate-song", {
        description: description,
        lang: lang
      });
      return res.data;
    } catch (err) {
      console.error("Error generating song from AimakeSong:", err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const aimakeSong = new AimakeSong();
    const response = await aimakeSong.generateSong(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}