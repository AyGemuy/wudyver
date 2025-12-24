import axios from "axios";
class TurboChat {
  constructor() {
    this.baseURL = "https://theturbochat.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://theturbochat.com",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    type = "chat",
    prompt,
    ...rest
  }) {
    try {
      console.log(`Memulai chat dengan type: ${type}, prompt: ${prompt?.substring(0, 50)}...`);
      const endpoints = {
        chat: "/chat",
        gemini: "/chatgemini",
        dalle: "/dalle"
      };
      const endpoint = endpoints[type] || endpoints.chat;
      const payload = this.buildPayload(type, prompt, rest);
      console.log(`Mengirim request ke: ${endpoint}`);
      const response = await axios.post(`${this.baseURL}${endpoint}`, payload, {
        headers: this.headers
      });
      console.log("Response diterima:", response?.status);
      const result = this.parseResponse(type, response?.data);
      if (type === "dalle" && result?.url) {
        console.log("Mengonversi base64 ke buffer...");
        const imageBuffer = this.base64ToBuffer(result.url);
        return {
          result: imageBuffer,
          base64: result.url,
          type: "image/png"
        };
      }
      return {
        result: result
      };
    } catch (error) {
      console.error("Error pada chat:", error?.message);
      return {
        error: error?.response?.data || error?.message || "Unknown error"
      };
    }
  }
  buildPayload(type, prompt, rest) {
    const basePayload = {
      language: rest?.language || "en",
      ...rest
    };
    const payloads = {
      chat: {
        message: prompt,
        model: rest?.model || "gpt-3.5-turbo",
        ...basePayload
      },
      gemini: {
        prompt: prompt,
        ...basePayload
      },
      dalle: {
        message: prompt,
        ...basePayload
      }
    };
    return payloads[type] || payloads.chat;
  }
  parseResponse(type, data) {
    const parsers = {
      chat: () => data?.choices?.[0]?.message?.content || data?.content || data,
      gemini: () => data?.generatedText || data,
      dalle: () => ({
        url: data?.url || data?.image
      })
    };
    return (parsers[type] || parsers.chat)();
  }
  base64ToBuffer(base64Uri) {
    try {
      console.log("Mengonversi base64 URI ke buffer...");
      const base64Data = base64Uri.replace(/^data:image\/\w+;base64,/, "");
      return Buffer.from(base64Data, "base64");
    } catch (error) {
      console.error("Error konversi base64:", error?.message);
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
    const api = new TurboChat();
    const response = await api.chat(params);
    if (params.type === "dalle" && response.result instanceof Buffer) {
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(response.result);
    }
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}