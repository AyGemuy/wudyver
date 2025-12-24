import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class AiImageGenerator {
  constructor() {
    this.baseURL = "https://aiimage.skytiming.site/generate";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://aiimage.skytiming.site",
      priority: "u=1, i",
      referer: "https://aiimage.skytiming.site/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate(payload = {}) {
    const {
      model = "black-forest-labs/flux-schnell",
        prompt = "men",
        go_fast = false,
        megapixels = "1",
        num_outputs = 1,
        aspect_ratio = "9:16",
        output_format = "png",
        output_quality = 100,
        num_inference_steps = 4, ...additionalPayload
    } = payload;
    const finalPayload = {
      model: model,
      input: {
        prompt: prompt,
        go_fast: go_fast,
        megapixels: megapixels,
        num_outputs: num_outputs,
        aspect_ratio: aspect_ratio,
        output_format: output_format,
        output_quality: output_quality,
        num_inference_steps: num_inference_steps,
        ...additionalPayload
      }
    };
    try {
      const response = await this.client.post(this.baseURL, finalPayload, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error generating AI image:", error.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) return res.status(400).json({
    error: 'Paramenter "prompt" wajib disertakan.'
  });
  const aiimg = new AiImageGenerator();
  try {
    const result = await aiimg.generate(params);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}