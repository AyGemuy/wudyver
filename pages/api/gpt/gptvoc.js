import axios from "axios";
class GptvocChat {
  constructor() {
    this.baseUrl = "https://apps.voc.ai/api/v1/plg/prompt_stream";
    this.headers = {
      accept: "text/event-stream",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://apps.voc.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://apps.voc.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-visitor-id": "34453bf1-0dce-4a7e-93ca-b7ed5c2a94e9"
    };
  }
  async chat(content) {
    try {
      const response = await axios.post(this.baseUrl, {
        prompt: content
      }, {
        headers: this.headers
      });
      const parsedData = response.data.split("\n").filter(line => line.startsWith("data:")).map(line => {
        try {
          const parsedLine = JSON.parse(line.slice(6));
          return parsedLine?.data?.is_end ? parsedLine?.data?.content : null;
        } catch (error) {
          console.error("Error parsing JSON:", error.message);
          return null;
        }
      }).filter(content => content !== null).join("");
      return parsedData || null;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt: text
  } = req.method === "POST" ? req.body : req.query;
  const gptvoc = new GptvocChat();
  if (!text) {
    return res.status(400).json({
      message: "Prompt is required."
    });
  }
  try {
    const data = await gptvoc.chat(text);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}