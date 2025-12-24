import axios from "axios";
import crypto from "crypto";
class ChatPlusAPI {
  constructor() {
    this.client = axios.create({
      baseURL: "https://chatplus.com/api",
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "application/json",
        Origin: "https://chatplus.com",
        Pragma: "no-cache",
        Referer: "https://chatplus.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
  }
  async chat({
    prompt,
    messages = [],
    sessionId = `guest_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    model = "gpt-4o-mini",
    ...rest
  }) {
    try {
      console.log("Proses chat dimulai...", {
        sessionId: sessionId,
        prompt: prompt?.slice(0, 50),
        messagesCount: messages.length
      });
      const allMessages = [...messages, ...prompt ? [{
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        role: "user",
        content: prompt,
        parts: [{
          type: "text",
          text: prompt
        }]
      }] : []];
      if (!allMessages.length) {
        throw new Error("Prompt or messages is required");
      }
      const payload = {
        id: sessionId,
        messages: allMessages,
        selectedChatModelId: model,
        token: null,
        ...rest
      };
      console.log("Mengirim request...", {
        sessionId: sessionId,
        messagesCount: allMessages.length
      });
      const response = await this.client.post("/chat", payload);
      console.log("Response diterima:", response?.status);
      const data = response?.data || "";
      const lines = data.split("\n").filter(line => line.trim() !== "");
      let messageId = null;
      let resultText = "";
      let eventData = {};
      for (const line of lines) {
        const prefix = line.substring(0, 2);
        const content = line.substring(2);
        if (prefix === "f:") {
          try {
            const parsedContent = JSON.parse(content);
            messageId = parsedContent.messageId || null;
          } catch (e) {
            console.error("Gagal mem-parsing baris f:", content);
          }
        } else if (prefix === "0:") {
          try {
            const parsedChunk = JSON.parse(content);
            resultText += parsedChunk;
          } catch (e) {
            console.error("Gagal mem-parsing baris 0:", content);
            resultText += content.startsWith('"') && content.endsWith('"') ? content.slice(1, -1) : content;
          }
        } else if (prefix === "e:" || prefix === "d:") {
          try {
            eventData = JSON.parse(content);
          } catch (e) {
            console.error(`Gagal mem-parsing baris ${prefix}`, content);
          }
        }
      }
      const usage = eventData?.usage || {
        promptTokens: null,
        completionTokens: null
      };
      const reason = eventData?.finishReason || "unknown";
      console.log("Proses selesai:", {
        resultLength: resultText.length,
        usage: usage,
        reason: reason
      });
      return {
        result: resultText || "No response",
        sessionId: sessionId,
        usage: usage,
        reason: reason,
        messageId: messageId
      };
    } catch (error) {
      console.error("Error pada chat:", error?.response?.data || error?.message);
      return {
        result: "Error: " + (error?.response?.data?.message || error?.message || "Unknown error"),
        sessionId: sessionId,
        usage: {
          promptTokens: null,
          completionTokens: null
        },
        reason: "error",
        messageId: null
      };
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
  try {
    const api = new ChatPlusAPI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}