import axios from "axios";
class BibleGPT {
  constructor() {
    this.apiUrl = "https://biblegpt.prasetia.me/api/generate";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://biblegpt.prasetia.me",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://biblegpt.prasetia.me/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    prompt
  }) {
    try {
      const res = await axios.post(this.apiUrl, {
        prompt: prompt
      }, {
        headers: this.headers
      });
      return {
        result: res.data
      };
    } catch (error) {
      return {
        result: error?.response?.data || error.message
      };
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
    const gpt = new BibleGPT();
    const response = await gpt.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}