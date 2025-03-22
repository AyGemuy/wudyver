import axios from "axios";
class JinaAI {
  constructor() {
    this.url = "https://api.promptperfect.jina.ai/q4WyOMb4lmmVGniJSgQi";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://jina.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://jina.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async convert({
    lang = "JavaScript",
    code
  }) {
    try {
      if (!lang || !code) throw new Error("Parameter lang dan code diperlukan");
      const response = await axios.post(this.url, {
        parameters: {
          lang: lang,
          curl: code
        }
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error di convert():", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      lang,
      code
    } = req.body;
    if (!lang || !code) {
      return res.status(400).json({
        error: "Parameter lang dan code diperlukan"
      });
    }
    const jina = new JinaAI();
    const result = await jina.convert({
      lang: lang,
      code: code
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error di API handler:", error.message);
    return res.status(500).json({
      error: "Terjadi kesalahan di server"
    });
  }
}