import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class FlowithChat {
  constructor(baseURL = "https://edge.flowith.net") {
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        authorization: "",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://flowith.io",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://flowith.io/",
        responsetype: "stream",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  generateNodeId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  async chat({
    prompt,
    messages = [],
    model,
    ...rest
  }) {
    try {
      console.log("Mempersiapkan permintaan chat...");
      const chatMessages = messages.length ? messages : [{
        content: prompt,
        role: "user"
      }];
      const nodeId = this.generateNodeId();
      console.log(`Generated nodeId: ${nodeId}`);
      const requestData = {
        model: model || "gpt-5-mini",
        messages: chatMessages,
        stream: true,
        nodeId: nodeId,
        ...rest
      };
      console.log("Mengirim permintaan ke server...");
      const response = await this.client.post("/ai/chat?mode=general", requestData, {
        responseType: "text"
      });
      console.log("Permintaan berhasil, menerima response stream...");
      return {
        result: response.data
      };
    } catch (error) {
      console.error("Error dalam proses chat:", error.message);
      if (error.response) {
        console.error("Status error:", error.response.status);
        console.error("Data error:", error.response.data);
      }
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
    const chatClient = new FlowithChat();
    const response = await chatClient.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}