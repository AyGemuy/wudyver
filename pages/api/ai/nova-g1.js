import axios from "axios";
class NovaChat {
  constructor() {
    this.baseURL = "https://nova-g1.onrender.com/chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://nova-g1.onrender.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://nova-g1.onrender.com/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    prompt
  }) {
    try {
      const response = await axios.post(this.baseURL, {
        message: prompt
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const nova = new NovaChat();
  try {
    const data = await nova.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}