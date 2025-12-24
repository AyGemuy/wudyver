import axios from "axios";
import crypto from "crypto";
class ChatAPI {
  constructor() {
    this.client = axios.create({
      baseURL: "https://acepal-chat.vercel.app/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://acepal-chat.vercel.app",
        priority: "u=1, i",
        referer: "https://acepal-chat.vercel.app/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async chat({
    prompt,
    messages = [],
    sessionId = `session_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    ...rest
  }) {
    try {
      console.log("Proses chat dimulai...", {
        sessionId: sessionId,
        prompt: prompt?.slice(0, 50),
        messagesCount: messages.length
      });
      const allMessages = [...messages, ...prompt ? [{
        role: "user",
        content: prompt
      }] : []];
      if (!allMessages.length) {
        throw new Error("Prompt or messages is required");
      }
      const payload = {
        messages: allMessages,
        sessionId: sessionId,
        ...rest
      };
      console.log("Mengirim request...", {
        sessionId: sessionId,
        messagesCount: allMessages.length
      });
      const response = await this.client.post("/chat", payload);
      console.log("Response diterima:", response?.status);
      const data = response?.data || "";
      const lines = data.split("\n");
      const result = lines.filter(line => line.trim() && !line.startsWith("e:") && !line.startsWith("d:")).map(line => {
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          const content = line.slice(colonIndex + 1).trim();
          if (content.startsWith('"') && content.endsWith('"')) {
            return content.slice(1, -1);
          }
          return content;
        }
        return line;
      }).filter(text => text && text !== "null").join("");
      const eventLine = lines.find(line => line.startsWith("e:")) || lines.find(line => line.startsWith("d:"));
      const eventData = eventLine ? JSON.parse(eventLine.slice(2)) : {};
      const usage = eventData?.usage || {
        promptTokens: 0,
        completionTokens: 0
      };
      const reason = eventData?.finishReason || "unknown";
      console.log("Proses selesai:", {
        resultLength: result.length,
        usage: usage,
        reason: reason
      });
      return {
        result: result || "No response",
        sessionId: sessionId,
        usage: usage,
        reason: reason
      };
    } catch (error) {
      console.error("Error pada chat:", error?.response?.data || error?.message);
      return {
        result: "Error: " + (error?.response?.data?.message || error?.message || "Unknown error"),
        sessionId: sessionId || `session_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        usage: {
          promptTokens: 0,
          completionTokens: 0
        },
        reason: "error"
      };
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
    const api = new ChatAPI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}