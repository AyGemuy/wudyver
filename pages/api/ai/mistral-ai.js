import axios from "axios";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class MistralAIChat {
  constructor() {
    this.baseUrl = "https://mistral-ai.chat";
    this.ajaxUrl = "https://mistral-ai.chat/wp-admin/admin-ajax.php";
    this.nonce = null;
    this.cookieJar = [];
    this.sessionData = {};
  }
  async init() {
    try {
      console.log("Initializing session...");
      const response = await axios.get(this.baseUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          ...SpoofHead()
        }
      });
      this.storeCookies(response);
      const $ = cheerio.load(response.data);
      const scriptContent = $("#ai-chat-script-js-extra").html();
      if (scriptContent) {
        const match = scriptContent.match(/"nonce":"([^"]+)"/);
        if (match && match[1]) {
          this.nonce = match[1];
          console.log("Nonce extracted:", this.nonce);
        } else {
          throw new Error("Nonce not found in script content");
        }
      } else {
        throw new Error("Script element not found");
      }
      console.log("Session initialized successfully");
      return true;
    } catch (error) {
      console.error("Initialization error:", error.message);
      throw error;
    }
  }
  storeCookies(response) {
    if (response.headers["set-cookie"]) {
      response.headers["set-cookie"].forEach(cookie => {
        this.cookieJar.push(cookie.split(";")[0]);
      });
      console.log("Cookies stored:", this.cookieJar.length);
    }
  }
  getCookieHeader() {
    return this.cookieJar.join("; ");
  }
  async chat({
    prompt,
    ...rest
  }) {
    try {
      console.log("Sending chat message:", prompt);
      if (!this.nonce) {
        await this.init();
      }
      const formData = new URLSearchParams();
      formData.append("action", "ai_chat_response");
      formData.append("message", prompt);
      formData.append("nonce", this.nonce);
      Object.keys(rest).forEach(key => {
        formData.append(key, rest[key]);
      });
      const response = await axios.post(this.ajaxUrl, formData.toString(), {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "id-ID,id;q=0.9",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: this.baseUrl,
          Priority: "u=1, i",
          Referer: this.baseUrl + "/",
          "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": '"Android"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
          Cookie: this.getCookieHeader(),
          ...SpoofHead()
        }
      });
      this.storeCookies(response);
      console.log("Chat response received successfully");
      return response.data;
    } catch (error) {
      console.error("Chat error:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
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
    const chatBot = new MistralAIChat();
    const response = await chatBot.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}