import axios from "axios";
export default async function handler(req, res) {
  const {
    prompt,
    assistant
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const response1 = await axios.post("https://www.pinoygpt.com/wp-json/mwai/v1/start_session", {}, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.pinoygpt.com/#google_vignette"
      }
    });
    const data1 = response1.data;
    if (!data1.success) {
      throw new Error("Failed to start session");
    }
    const chatData = {
      botId: "default",
      customId: "e369e9665e1e4fa3fd0cdc970f31cf12",
      session: "N/A",
      chatId: "qrdd22c3t5c",
      contextId: 12,
      messages: [{
        id: "2a4z9ylw16j",
        role: "assistant",
        content: assistant || "Hi! How can I help you?",
        who: "AI: ",
        timestamp: Date.now()
      }],
      newMessage: prompt,
      newFileId: null,
      stream: true
    };
    const response2 = await axios.post("https://www.pinoygpt.com/wp-json/mwai-ui/v1/chats/submit", chatData, {
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": data1.restNonce,
        Accept: "text/event-stream",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.pinoygpt.com/#google_vignette"
      }
    });
    const responseData2 = response2.data;
    const lines = responseData2.trim().split("\n");
    const endIndex = lines.findIndex(line => line.includes('"type":"end"'));
    const reply = endIndex !== -1 ? JSON.parse(JSON.parse(lines[endIndex].slice(6)).data).reply : null;
    if (!reply) {
      throw new Error("Failed to parse reply from PinoyGpt");
    }
    return res.status(200).json({
      result: reply
    });
  } catch (error) {
    console.error("PinoyGpt error:", error);
    return res.status(500).json({
      error: "Failed to get response from PinoyGpt"
    });
  }
}