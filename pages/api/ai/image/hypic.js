import axios from "axios";
class HypicAPI {
  constructor() {
    this.baseUrl = "https://hypic.app/generate";
    this.defaultHeaders = {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      cookie: "_ga_G0WGJB40SC=GS1.1.1736915167.1.0.1736915167.0.0.0; _ga=GA1.1.745785636.1736915167",
      pragma: "no-cache",
      priority: "i",
      referer: "https://hypic.app/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "image",
      "sec-fetch-mode": "no-cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateImage({
    prompt,
    width = 1024,
    height = 1024,
    seed = 43,
    model = "flux",
    nologo = true,
    nofeed = true
  }) {
    if (!prompt) throw new Error('Parameter "prompt" harus diisi.');
    const url = `${this.baseUrl}/${prompt}`;
    const params = {
      width: width,
      height: height,
      seed: seed,
      model: model,
      nologo: nologo,
      nofeed: nofeed
    };
    try {
      const response = await axios.get(url, {
        headers: this.defaultHeaders,
        params: params,
        responseType: "arraybuffer"
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const hypic = new HypicAPI();
  if (!params.prompt) return res.status(400).json({
    error: 'Parameter "prompt" wajib disertakan.'
  });
  try {
    const response = await hypic.generateImage(params);
    if (!response.success) return res.status(500).json({
      error: response.message
    });
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(response.data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}