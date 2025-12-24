import axios from "axios";
import {
  URLSearchParams
} from "url";
class PowerBrainAI {
  constructor() {
    this.chatUrl = "https://powerbrainai.com/chat.php";
    this.refererUrl = "https://powerbrainai.com/chat.html";
    this.sessionCookies = null;
  }
  async initializeSession() {
    try {
      const response = await axios.get(this.refererUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": '"Android"'
        }
      });
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.sessionCookies = setCookieHeader.map(cookie => cookie.split(";")[0]).join("; ");
      }
    } catch (error) {
      console.error("Error initializing PowerBrainAI session:", error.message);
    }
  }
  async chat({
    prompt: message,
    messageCount,
    ...rest
  }) {
    if (!message) {
      throw new Error("Message must be provided for the chat.");
    }
    if (messageCount === undefined || messageCount === null) {
      messageCount = 1;
    }
    if (!this.sessionCookies) {
      await this.initializeSession();
    }
    const requestBody = new URLSearchParams({
      message: message,
      messageCount: messageCount.toString(),
      ...rest
    }).toString();
    const headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://powerbrainai.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: this.refererUrl,
      "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    if (this.sessionCookies) {
      headers.Cookie = this.sessionCookies;
    }
    try {
      const response = await axios.post(this.chatUrl, requestBody, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Error during PowerBrainAI chat API call:", error.message);
      throw new Error("Failed to chat with PowerBrainAI: " + (error.response?.data || error.message));
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
    const api = new PowerBrainAI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}