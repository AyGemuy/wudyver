import fetch from "node-fetch";
import crypto from "crypto";
const AVAILABLE_MODELS = ["gpt-4o-mini", "toolbaz_v3.5_pro", "toolbaz_v3", "toolbaz_v2", "unfiltered_x", "mixtral_8x22b", "Qwen2-72B", "Llama-3-70B"];
const defaultHeaders = {
  Host: "ai-chats.org",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0",
  Accept: "application/json, text/event-stream",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "content-type": "application/json",
  Origin: "https://ai-chats.org",
  DNT: "1",
  "Sec-GPC": "1",
  "Alt-Used": "ai-chats.org",
  Connection: "keep-alive",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Priority: "u=0",
  TE: "trailers",
  Cookie: "muVyak=tJMOFKrViLsmxYlNZPCXyoUwqIdjkS; ai-chat-front=1d38ca3a77c409025efec9639084337b; _csrf-front=b5f45dfb9a135dc88dabae2f8cbdbde90574ed8afa45d2931e6d9968cf3f1f9da%3A2%3A%7Bi%3A0%3Bs%3A11%3A%22_csrf-front%22%3Bi%3A1%3Bs%3A32%3A%224tjSi5lj7FpReYG6U80H9ln9SaQLUawb%22%3B%7D; tJMOFKrViLsmxYlNZPCXyoUwqIdjkS=2d9de59a0f765254848977d8b0dd8934-1729318097"
};
const generateSessionId = () => crypto.randomUUID();
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
  try {
    const {
      prompt,
      type = "chat",
      model = "gpt-4o-mini",
      sessionId = generateSessionId()
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }
    if (!AVAILABLE_MODELS.includes(model)) {
      return res.status(400).json({
        error: `Invalid model. Available models are: ${AVAILABLE_MODELS.join(", ")}`
      });
    }
    const url = "https://ai-chats.org/chat/send2/";
    const headers = {
      ...defaultHeaders,
      Referer: type === "image" ? "https://ai-chats.org/image/" : "https://ai-chats.org/chat/"
    };
    const body = JSON.stringify({
      type: type,
      messagesHistory: [{
        id: sessionId,
        from: "you",
        content: prompt
      }]
    });
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    if (type === "image") {
      const data = await response.json();
      return res.status(200).json({
        result: data.data[0]?.url
      });
    } else {
      const data = await response.text();
      const message = data.split("\n").filter(line => line.trim()).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("") || data;
      return res.status(200).json({
        result: message
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}