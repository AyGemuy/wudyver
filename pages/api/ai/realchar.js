import WebSocket from "ws";
class RealCharAI {
  async chat({
    prompt,
    token = "",
    name = "loki",
    id = "5a0506d1dd2642508d8d67ecff7c0592",
    language = "en",
    model = "gpt-3.5-turbo-0125"
  }) {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`wss://api.realchar.ai/ws/${id}?llm_model=${model}&platform=web&journal_mode=false&character_id=${name}&language=${language}&token=${token}`);
        let finalResponse = "";
        let capture = false;
        ws.on("open", () => {
          ws.send(prompt);
        });
        ws.on("message", data => {
          const msg = data.toString();
          if (msg.startsWith("[end=")) {
            ws.close();
          } else if (capture) {
            finalResponse += msg;
          } else if (msg.startsWith("[end")) {
            capture = true;
          }
        });
        ws.on("close", () => {
          resolve({
            result: finalResponse
          });
        });
        ws.on("error", err => {
          console.error("WebSocket error:", err);
          reject(new Error("WebSocket connection error"));
        });
      } catch (error) {
        console.error("Error in chat function:", error);
        reject(error);
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Input prompt is required!"
    });
  }
  const realChar = new RealCharAI();
  try {
    const response = await realChar.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: "Error connecting to WebSocket"
    });
  }
}