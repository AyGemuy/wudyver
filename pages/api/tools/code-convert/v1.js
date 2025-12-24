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
  async convertCode({
    lang = "JavaScript",
    code
  }) {
    try {
      if (!lang || !code) throw new Error("Paramenter lang dan code diperlukan");
      const response = await axios.post(this.url, {
        parameters: {
          lang: lang,
          curl: code
        }
      }, {
        headers: this.headers
      });
      const inputString = response.data;
      const parsedString = inputString.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(6)).join("");
      return {
        output: parsedString
      };
    } catch (error) {
      console.error("Error di convert():", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Code is required"
    });
  }
  const converter = new CodeConverter();
  try {
    const data = await converter.convertCode(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}