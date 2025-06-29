import axios from "axios";
class GeminiAPI {
  constructor() {
    this.baseUrl = "https://us-central1-infinite-chain-295909.cloudfunctions.net/gemini-proxy-staging-v1";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImage(imgUrl) {
    try {
      const response = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      return {
        mime_type: response.headers["content-type"],
        data: Buffer.from(response.data, "binary").toString("base64")
      };
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    model = "gemini-2.0-flash-lite",
    imgUrl
  }) {
    try {
      const requestData = {
        model: model,
        contents: [{
          parts: [...imgUrl ? [{
            inline_data: await this.getImage(imgUrl)
          }] : [], {
            text: prompt
          }]
        }]
      };
      const response = await axios.post(this.baseUrl, requestData, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error during chat request:", error.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const gemini = new GeminiAPI();
  try {
    const data = await gemini.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}