import fetch from "node-fetch";
async function startSession() {
  try {
    const url = "https://www.controllino.ai/wp-json/mwai/v1/start_session";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.controllino.ai/"
    };
    const response = await fetch(url, {
      method: "POST",
      headers: headers
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    const nonce = data.restNonce;
    return nonce;
  } catch (error) {
    console.error("Error fetching session:", error.message);
    return null;
  }
}
async function ControllinoChat(newMessage) {
  try {
    const nonce = await startSession();
    if (!nonce) throw new Error("Failed to get nonce");
    const url = "https://www.controllino.ai/wp-json/mwai-ui/v1/chats/submit";
    const headers = {
      "Content-Type": "application/json",
      "X-WP-Nonce": nonce,
      Accept: "text/event-stream",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.controllino.ai/"
    };
    const body = JSON.stringify({
      botId: "chatbot-g65ss4",
      customId: null,
      session: "N/A",
      chatId: "47ul0pvsrt",
      contextId: 16400,
      messages: [],
      newMessage: newMessage,
      newFileId: null,
      stream: false
    });
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const result = await response.json();
    return result.reply || "No msg";
  } catch (error) {
    console.error("Error:", error.message);
    return "Error occurred";
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await ControllinoChat(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}