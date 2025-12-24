import axios from "axios";
class WordviceService {
  constructor() {
    this.apiUrl = "https://sysapi.wordvice.ai/tools/non-member/fetch-llm-result";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json;charset=UTF-8",
      origin: "https://wordvice.ai",
      priority: "u=1, i",
      referer: "https://wordvice.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async translate({
    text,
    from = "auto",
    to = "id"
  }) {
    try {
      const response = await axios.post(this.apiUrl, {
        prompt: `Translate the following ${from} text into ${to}.`,
        text: text,
        tool: "translate"
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text is required"
    });
  }
  const wordvice = new WordviceService();
  try {
    const data = await wordvice.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}