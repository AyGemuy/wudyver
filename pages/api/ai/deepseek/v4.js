import axios from "axios";
class DeepSeekEmbed {
  constructor(baseUrl = "https://hub.malson.eu/api/products") {
    this.baseUrl = baseUrl;
  }
  generateDeviceId() {
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestampPart = Date.now().toString(36);
    return `device_${randomPart}${timestampPart}`;
  }
  parseSSE(input) {
    const lines = input.trim().split("\n");
    let result = "";
    let id = null;
    let streamingStarted = false;
    let waitingForThreadIdData = false;
    for (const line of lines) {
      if (line.startsWith("event: thread_info")) {
        waitingForThreadIdData = true;
      } else if (waitingForThreadIdData && line.startsWith("data: {") && line.endsWith("}")) {
        try {
          const parsedData = JSON.parse(line.substring(line.indexOf("{")));
          id = parsedData?.threadId || null;
        } catch (error) {}
        waitingForThreadIdData = false;
      } else if (line.startsWith('data: "<START_STREAMING_SSE>"')) {
        streamingStarted = true;
      } else if (line.startsWith('data: "<END_STREAMING_SSE>"')) {
        break;
      } else if (streamingStarted && line.startsWith('data: "') && line.endsWith('"')) {
        result += line.substring(line.indexOf('"') + 1, line.length - 1);
      }
    }
    return {
      result: result.trim(),
      id: id
    };
  }
  async sendPrompt({
    prompt,
    history = [],
    personalize = "",
    thread_id = "0",
    device_id = this.generateDeviceId(),
    product = "deepseek_embed"
  }) {
    try {
      const response = await axios.post(`${this.baseUrl}/deepseek_embed/prompt/stream/send`, {
        prompt: prompt,
        data: JSON.stringify({
          history: history
        }),
        personalize: personalize,
        thread_id: thread_id,
        device_id: device_id,
        product: product
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "application/json",
          origin: "https://deepseekai.works",
          pragma: "no-cache",
          referer: "https://deepseekai.works/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      return this.parseSSE(response.data);
    } catch (error) {
      console.error("Terjadi kesalahan saat mengirim prompt:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const deepSeek = new DeepSeekEmbed();
    const response = await deepSeek.sendPrompt(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}