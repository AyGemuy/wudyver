import axios from "axios";
class CodeConverter {
  constructor() {
    this.url = "https://www.codeconvert.ai/api/convert-code";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.codeconvert.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.codeconvert.ai/free-converter",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async convertCode({
    code = "print(9)",
    lang = "Python",
    to = "JavaScript",
    instruct = ""
  }) {
    try {
      const data = {
        inputLang: lang,
        outputLang: to,
        inputCode: code,
        customInstructions: instruct
      };
      console.log("Sending request with data:", data);
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      console.log("Conversion response:", response.data);
      return {
        output: response.data
      };
    } catch (error) {
      console.error("Error converting code:", error);
      throw error;
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