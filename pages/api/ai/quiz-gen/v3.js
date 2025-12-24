import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class QuizGenerator {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://www.makeform.ai",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.makeform.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.makeform.ai/c/6f98e4b7-836e-4ac1-80a2-92626c59e7fc",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async generate({
    prompt,
    messages = [],
    model = "gpt-41-mini",
    chatId = null
  }) {
    try {
      console.log("Memulai generate quiz dari MakeForm.ai...");
      let finalMessages;
      if (Array.isArray(messages) && messages.length > 0) {
        finalMessages = messages.map((msg, index) => ({
          id: msg.id || `msg_${Date.now()}_${index}`,
          role: msg.role || "user",
          parts: Array.isArray(msg.parts) ? msg.parts : [{
            type: "text",
            text: msg.text || msg.content || ""
          }]
        }));
      } else if (prompt) {
        finalMessages = [{
          id: `msg_${Date.now()}`,
          role: "user",
          parts: [{
            type: "text",
            text: prompt
          }]
        }];
      } else {
        return {
          success: false,
          error: true,
          message: "Harap berikan 'prompt' atau 'messages'"
        };
      }
      const payload = {
        model: model,
        id: chatId || `chat_${Date.now()}`,
        messages: finalMessages,
        trigger: "submit-message"
      };
      const response = await this.client.post("/api/fb/chat/v3", payload, {
        responseType: "stream"
      });
      const stream = response.data;
      let fullText = "";
      const chunks = [];
      return new Promise(resolve => {
        stream.on("data", chunk => {
          const lines = chunk.toString().split("\n").filter(Boolean);
          lines.forEach(line => {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") return;
              try {
                const data = JSON.parse(dataStr);
                chunks.push(data);
                if (data.type === "text-delta" && data.delta) {
                  fullText += data.delta;
                }
              } catch (e) {}
            }
          });
        });
        stream.on("end", () => {
          console.log("Generate quiz selesai");
          resolve({
            success: true,
            result: fullText.trim(),
            chunks: chunks,
            count: finalMessages.length
          });
        });
        stream.on("error", err => {
          console.error("Stream error:", err.message);
          resolve({
            success: false,
            error: true,
            message: err.message || "Streaming error"
          });
        });
      });
    } catch (error) {
      console.error("Generate gagal:", error.response?.data || error.message);
      return {
        success: false,
        error: true,
        message: error.response?.data || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new QuizGenerator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}