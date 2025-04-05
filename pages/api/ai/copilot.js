import WebSocket from "ws";
class ChatCopilot {
  constructor() {
    this.url = "wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-%2Cncedge%2Cedgepagecontext&setflight=-%2Cncedge%2Cedgepagecontext&ncedge=1";
  }
  async chat({
    prompt
  }) {
    const url = this.url;
    const ws = new WebSocket(url);
    let result = "";
    const chars = "eEQqRXUu123456CcbBZzhj";
    const conversationId = Array.from({
      length: 21
    }).map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
    const payload = {
      event: "send",
      conversationId: conversationId,
      content: [{
        type: "text",
        text: prompt
      }],
      mode: "chat",
      context: {
        edge: "NoConsent"
      }
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Timeout: Response took too long"));
      }, 15e3);
      ws.on("open", () => ws.send(JSON.stringify(payload)));
      ws.on("message", data => {
        try {
          const response = JSON.parse(data.toString());
          if (response.text) result += response.text;
          if (response.event === "done") {
            clearTimeout(timeout);
            ws.close();
            resolve(result);
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(error);
        }
      });
      ws.on("error", error => {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      });
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const copilot = new ChatCopilot();
  try {
    const data = await copilot.chat(params);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}