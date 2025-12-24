import WebSocket from "ws";
class WSChat {
  constructor(options = {}) {
    this.options = {
      origin: "https://a.picoapps.xyz",
      userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...options
    };
  }
  async chat({
    type = "askai",
    prompt,
    ...rest
  }) {
    try {
      const endpoint = type === "askai" ? `wss://a.picoapps.xyz/ask_ai_streaming?app_id=gasoline-kuwaiti&prompt=${encodeURIComponent(prompt)}` : "wss://backend.buildpicoapps.com/api/chatbot/chat";
      const ws = new WebSocket(endpoint, {
        headers: {
          Upgrade: "websocket",
          Origin: this.options.origin,
          "Cache-Control": "no-cache",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          Pragma: "no-cache",
          Connection: "Upgrade",
          "Sec-WebSocket-Key": this.generateWebSocketKey(),
          "User-Agent": this.options.userAgent,
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
        }
      });
      let result = "";
      if (type === "chatbot") {
        await new Promise(resolve => {
          ws.on("open", () => {
            const message = {
              chatId: this.generateUUID(),
              appId: "send-manager",
              systemPrompt: "You are a kind and gentle mentor who helps users learn and understand the concepts of SEO with patience and encouragement.",
              message: prompt,
              ...rest
            };
            ws.send(JSON.stringify(message));
            resolve();
          });
        });
      }
      const response = await new Promise((resolve, reject) => {
        ws.on("message", data => {
          try {
            result += data.toString();
          } catch (err) {
            console.error("Error processing message:", err);
          }
        });
        ws.on("close", () => {
          resolve({
            result: result
          });
        });
        ws.on("error", err => {
          console.error("WebSocket error:", err);
          reject(err);
        });
      });
      return response;
    } catch (err) {
      console.error("Error in chat:", err);
      throw err;
    }
  }
  generateWebSocketKey() {
    const randomBytes = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    return randomBytes.toString("base64");
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
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
    const chat = new WSChat();
    const response = await chat.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}