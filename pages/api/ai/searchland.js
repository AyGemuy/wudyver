import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class ChatRequest {
  constructor() {
    this.url = "https://searchengineland.com/wp-admin/admin-ajax.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "multipart/form-data",
      cookie: "__gads=ID=20677005b73ce33c:T=1737201088:RT=1737201088:S=ALNI_MZYNmqiQ3hYTVWcgiZCFt1FR25LIw;",
      origin: "https://searchengineland.com",
      pragma: "no-cache",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchData() {
    try {
      const {
        data
      } = await axios.get("https://searchengineland.com/microsoft-rebrands-bing-chat-as-copilot-434709");
      return cheerio.load(data);
    } catch (error) {
      console.error("Error fetching HTML:", error);
      throw error;
    }
  }
  async sendChat(message, params = {}) {
    try {
      const $ = await this.fetchData();
      const div = $("div.wpaicg-chat-shortcode");
      const {
        nonce,
        postId,
        url,
        botId
      } = {
        nonce: div.data("nonce") || "1df3c95a18",
        postId: div.data("post-id") || "434709",
        url: div.data("url") || "https://searchengineland.com/microsoft-rebrands-bing-chat-as-copilot-434709",
        botId: div.data("bot-id") || "0"
      };
      const form = new FormData();
      form.append("_wpnonce", nonce);
      form.append("post_id", postId);
      form.append("url", url);
      form.append("action", "wpaicg_chat_shortcode_message");
      form.append("message", message);
      form.append("bot_id", botId);
      form.append("chatbot_identity", "shortcode");
      form.append("wpaicg_chat_client_id", "gwp4HCSYpV");
      form.append("wpaicg_chat_history", JSON.stringify(params.history || [{
        text: "Human: Hello"
      }]));
      form.append("chat_id", params.chat_id || "44076");
      const response = await axios.post(this.url, form, {
        headers: {
          ...this.headers
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error sending chat request:", error);
      throw error;
    }
  }
  async generateImage(prompt, params = {}) {
    try {
      const $ = await this.fetchData();
      const div = $("div.wpaicg-chat-shortcode");
      const {
        nonce
      } = {
        nonce: div.data("nonce") || "194645eddb"
      };
      const form = new FormData();
      form.append("_wpnonce", nonce);
      form.append("prompt", prompt);
      form.append("artist", params.artist || "None");
      form.append("art_style", params.art_style || "None");
      form.append("photography_style", params.photography_style || "None");
      form.append("lighting", params.lighting || "None");
      form.append("subject", params.subject || "None");
      form.append("camera_settings", params.camera_settings || "None");
      form.append("composition", params.composition || "Rule of Thirds");
      form.append("resolution", params.resolution || "1080p (1920x1080)");
      form.append("color", params.color || "RGB");
      form.append("special_effects", params.special_effects || "None");
      form.append("action", "wpaicg_image_generator");
      form.append("img_model", params.img_model || "dall-e-3");
      form.append("img_size", params.img_size || "1024x1024");
      form.append("img_type", params.img_type || "vivid");
      form.append("num_images", params.num_images || 1);
      const response = await axios.post(this.url, form, {
        headers: {
          ...this.headers
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt = "hai",
      action = "chat", ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt || !action) {
    return res.status(400).json({
      message: "Prompt and action are required"
    });
  }
  const chatRequest = new ChatRequest();
  try {
    if (action === "chat") {
      const result = await chatRequest.sendChat(prompt, params);
      return res.status(200).json({
        success: true,
        result: result
      });
    } else if (action === "image") {
      const result = await chatRequest.generateImage(prompt, params);
      return res.status(200).json({
        success: true,
        result: result
      });
    } else {
      return res.status(400).json({
        message: "Invalid action"
      });
    }
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: "Failed to process the request",
      details: error.message
    });
  }
}