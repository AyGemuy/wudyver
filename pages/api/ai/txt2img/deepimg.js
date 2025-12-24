import axios from "axios";
class DeepImgAPI {
  constructor() {
    this.baseURL = "https://api-preview.apirouter.ai/api/v1/deepimg/flux-1-dev";
  }
  async generate({
    prompt,
    size = "1024x1024",
    n = 1,
    output_format = "png"
  }) {
    const device_id = crypto.randomUUID();
    const requestBody = {
      device_id: device_id,
      prompt: prompt,
      size: size,
      n: n,
      output_format: output_format
    };
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://deepimg.ai",
      pragma: "no-cache",
      referer: "https://deepimg.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    try {
      const response = await axios.post(this.baseURL, requestBody, {
        headers: headers
      });
      console.log("API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error generating image:", error);
      if (error.response) {
        console.error("Error data:", error.response.data);
        console.error("Error status:", error.response.status);
        console.error("Error headers:", error.response.headers);
        throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        console.error("No response received:", error.request);
        throw new Error("Network Error: No response received from API.");
      } else {
        console.error("Request setup error:", error.message);
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new DeepImgAPI();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}