import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class RabbitHoles {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.config = {
      baseURL: "https://rabbitholes.dojoma.ai/api/rabbitholes/search",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://rabbitholes.dojoma.ai",
        priority: "u=1, i",
        referer: "https://rabbitholes.dojoma.ai/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    };
  }
  async search({
    prompt: query,
    concept = "",
    followUpMode = "expansive"
  }) {
    try {
      const payload = {
        query: query,
        previousConversation: [],
        concept: concept,
        followUpMode: followUpMode,
        flowState: {
          nodes: [],
          edges: []
        }
      };
      const {
        data
      } = await this.client.post(this.config.baseURL, payload, {
        headers: this.config.headers
      });
      return data;
    } catch (error) {
      return console.error("Error:", error.response?.data || error.message), null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) return res.status(400).json({
    error: "Prompt tidak boleh kosong"
  });
  try {
    const chatbot = new RabbitHoles();
    const response = await chatbot.search(params);
    return response ? res.json(response) : res.status(500).json({
      error: "Gagal mengirim prompt"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}