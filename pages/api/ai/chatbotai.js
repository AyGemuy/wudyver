import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class ChatbotAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.baseURL = "https://chatbotai.one/wp-admin/admin-ajax.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "multipart/form-data",
      origin: "https://chatbotai.one",
      referer: "https://chatbotai.one/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async scrapeChatData() {
    try {
      const {
        data
      } = await this.client.get("https://chatbotai.one/", {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const chatData = $(".wpaicg-chat-shortcode").attr();
      return chatData;
    } catch (error) {
      console.error("Error scraping chat data:", error);
      return null;
    }
  }
  async sendMessage(message = "halo") {
    try {
      const chatData = await this.scrapeChatData();
      if (!chatData) throw new Error("Gagal mengambil data chatbot");
      const form = new FormData();
      form.append("_wpnonce", chatData["data-nonce"] || "");
      form.append("post_id", chatData["data-post-id"] || "11");
      form.append("url", chatData["data-url"] || "https://chatbotai.one");
      form.append("action", "wpaicg_chat_shortcode_message");
      form.append("message", message);
      form.append("bot_id", chatData["data-bot-id"] || "0");
      const {
        data
      } = await this.client.post(this.baseURL, form, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    error: "Prompt tidak boleh kosong"
  });
  try {
    const chatbot = new ChatbotAI();
    const response = await chatbot.sendMessage(prompt);
    return response.data ? res.json({
      result: response.data
    }) : res.status(500).json({
      error: "Gagal mengirim prompt"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}