import axios from "axios";
class BlinkshotImageGenerator {
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
      error: "prompt is required"
    });
  }
  const generator = new BlinkshotImageGenerator();
  try {
    const b64 = await generator.generate(params);
    const buffer = Buffer.from(b64, "base64");
    res.setHeader("Content-Type", "image/png");
    return res.send(buffer);
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
}