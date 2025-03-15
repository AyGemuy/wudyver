import axios from "axios";
import qs from "qs";
class PowerBrainAI {
  constructor() {
    this.url = "https://powerbrainai.com/chat.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      cookie: "_ga_ZXESHP7NVH=GS1.1.1737371805.1.0.1737371805.0.0.0; _ga=GA1.1.1945810011.1737371806; _gcl_au=1.1.1987930856.1737371806",
      origin: "https://powerbrainai.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://powerbrainai.com/chat.html",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.messageCount = 0;
  }
  async sendMessage(message) {
    try {
      this.messageCount += 1;
      const data = qs.stringify({
        message: message,
        messageCount: this.messageCount
      });
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      prompt
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({
        message: "No prompt provided"
      });
    }
    const powerBrainAI = new PowerBrainAI();
    const result = await powerBrainAI.sendMessage(prompt);
    return res.status(200).json({
      result: typeof result === "object" ? result : result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: error.message
    });
  }
}