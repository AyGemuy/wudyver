import WebSocket from "ws";
class AsyncChat {
  constructor() {
    this.ws = null;
    this.arr = [];
    this.result = "";
    this.headers = {
      Upgrade: "websocket",
      Origin: "https://textie.ai",
      "Cache-Control": "no-cache",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Pragma: "no-cache",
      Connection: "Upgrade",
      "Sec-WebSocket-Key": "MdNLK2OICDggWQ1ZhcXXgA==",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
    };
  }
  async connect() {
    try {
      console.log("Connecting to WebSocket...");
      this.ws = new WebSocket("wss://n4fav5pfnc.execute-api.eu-central-1.amazonaws.com/v1", {
        headers: this.headers
      });
      return new Promise((resolve, reject) => {
        this.ws.on("open", () => {
          console.log("WebSocket connection established");
          resolve();
        });
        this.ws.on("error", error => {
          console.error("WebSocket error:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      await this.connect();
      const payload = {
        action: "testchat",
        messages: [{
          role: "system",
          content: "You are a helpful assistant named Textie. You are here to help people with their questions. In the full version, you are a perfect AI tool that can do copywriting to anything, make amazing images, create presentations or translate documents and many more."
        }, ...messages, {
          role: "user",
          content: prompt
        }],
        ...rest
      };
      this.ws.send(JSON.stringify(payload));
      console.log("Message sent:", payload);
      return new Promise((resolve, reject) => {
        this.ws.on("message", data => {
          try {
            const parsed = JSON.parse(data);
            console.log("Received data:", parsed);
            if (parsed.delta?.content) {
              this.result += parsed.delta.content;
              this.arr.push(parsed.delta.content);
              console.log("Current result:", this.result);
            }
            if (parsed.finish_reason === "stop") {
              console.log("Chat completed");
              this.ws.close();
              resolve({
                result: this.result,
                arr: this.arr
              });
            }
          } catch (parseError) {
            console.error("Error parsing message:", parseError);
            reject(parseError);
          }
        });
        this.ws.on("close", () => {
          console.log("WebSocket connection closed");
        });
        this.ws.on("error", error => {
          console.error("WebSocket error during chat:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Chat error:", error);
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
    const client = new AsyncChat();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}