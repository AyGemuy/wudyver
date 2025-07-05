import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class ApiClient {
  constructor() {
    this.startSessionUrl = "https://aichatbots.one/wp-json/mwai/v1/start_session";
    this.submitChatUrl = "https://aichatbots.one/wp-json/mwai-ui/v1/chats/submit";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://aichatbots.one",
      priority: "u=1, i",
      referer: "https://aichatbots.one/ai-chatbot-free/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async startSession() {
    try {
      const response = await this.client.post(this.startSessionUrl, {}, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error starting session:", error.message);
      return null;
    }
  }
  generateChatPayload(sessionId, messages) {
    const timestamp = Date.now();
    return {
      botId: "chatbot-owtv5t",
      customId: null,
      session: sessionId,
      chatId: `chat-${timestamp}`,
      contextId: Math.floor(Math.random() * 100),
      messages: messages.map((msg, index) => ({
        id: `msg-${timestamp}-${index}`,
        role: msg.role || "user",
        content: msg.content,
        who: msg.who || ":User       ",
        timestamp: timestamp + index * 1e3
      })),
      newMessage: messages[messages.length - 1].content,
      newFileId: null,
      stream: false
    };
  }
  async submitChat(sessionId, restNonce, messages) {
    const chatData = this.generateChatPayload(sessionId, messages);
    try {
      const response = await this.client.post(this.submitChatUrl, chatData, {
        headers: {
          ...this.headers,
          "x-wp-nonce": restNonce
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error submitting chat:", error.message);
      return null;
    }
  }
  async chat({
    prompt,
    session_id,
    messages
  }) {
    let sessionResponse = session_id ? {
      sessionId: session_id
    } : await this.startSession();
    session_id = sessionResponse?.success && sessionResponse.sessionId !== "N/A" ? sessionResponse.sessionId : null;
    if (!session_id) {
      throw new Error("Failed to start session");
    }
    const chatMessages = messages || [{
      role: "user",
      content: prompt
    }];
    return await this.submitChat(session_id, sessionResponse.restNonce, chatMessages);
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    session_id,
    messages
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt && !messages) {
    return res.status(400).json({
      error: "Input prompt or messages is required."
    });
  }
  const client = new ApiClient();
  try {
    const response = await client.chat({
      prompt: prompt ? prompt : null,
      session_id: session_id,
      messages: messages ? messages : prompt ? null : undefined
    });
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in chat API:", error.message);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}