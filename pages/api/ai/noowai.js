import axios from "axios";
class NoowaiChat {
  constructor() {
    this.baseURL = "https://noowai.com/wp-json";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://noowai.com/"
    };
    this.nonce = null;
    this.sessionId = null;
  }
  extractEndData(input) {
    console.log(input);
    return JSON.parse(input.split("\n").map(line => {
      try {
        return JSON.parse(line.slice(5));
      } catch (e) {
        return null;
      }
    }).find(v => v?.type === "end")).data;
  }
  async startSession() {
    try {
      const response = await axios.post(`${this.baseURL}/mwai/v1/start_session`, {}, {
        headers: this.headers
      });
      if (response.data?.success) {
        this.nonce = response.data.restNonce;
        this.sessionId = response.data.sessionId;
        return {
          nonce: this.nonce,
          sessionId: this.sessionId
        };
      }
      return null;
    } catch (error) {
      console.error(`Error starting session: ${error.message}`);
      return null;
    }
  }
  async sendMessage(chatId, message) {
    if (!this.nonce || !this.sessionId) {
      console.error("Session or nonce is missing. Start a session first.");
      return null;
    }
    const payload = {
      botId: "default",
      customId: null,
      session: this.sessionId,
      chatId: chatId,
      contextId: 25,
      messages: [{
        id: "1ex1d0rbzbk",
        role: "assistant",
        content: "Hi! How can I help you?",
        who: "AI: ",
        timestamp: Date.now()
      }],
      newMessage: message,
      newFileId: null,
      stream: true
    };
    try {
      const response = await axios.post(`${this.baseURL}/mwai-ui/v1/chats/submit`, payload, {
        headers: {
          ...this.headers,
          "X-WP-Nonce": this.nonce
        }
      });
      return this.extractEndData(response.data);
    } catch (error) {
      console.error(`Error sending message: ${error.message}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const chat = new NoowaiChat();
  const {
    chatId = "u4ye0hwdop",
      prompt: message
  } = req.method === "GET" ? req.query : req.body;
  if (!message) {
    return res.status(400).json({
      error: "prompt is required."
    });
  }
  const session = await chat.startSession();
  if (!session) {
    return res.status(500).json({
      error: "Failed to start session."
    });
  }
  const response = await chat.sendMessage(chatId, message);
  if (!response) {
    return res.status(500).json({
      error: "Failed to send message."
    });
  }
  return res.status(200).json({
    response: response
  });
}