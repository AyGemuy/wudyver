import axios from "axios";
class Blinkshot {
  constructor() {
    this.apiUrl = "https://www.blinkshot.io/api/generateImages";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.blinkshot.io",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.blinkshot.io/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    prompt,
    key = "",
    iterative = false,
    style = ""
  }) {
    const body = {
      prompt: prompt,
      userAPIKey: key,
      iterativeMode: iterative,
      style: style
    };
    const response = await axios.post(this.apiUrl, body, {
      headers: this.headers
    });
    if (response.data?.b64_json) return response.data.b64_json;
    throw new Error("No image returned");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Blinkshot();
  try {
    const data = await api.generate(params);
    if (data) {
      const imageBuffer = Buffer.from(data, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imageBuffer);
    }
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}