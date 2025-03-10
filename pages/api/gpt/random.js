import fetch from "node-fetch";
import {
  FormData,
  Blob
} from "formdata-node";
import * as cheerio from "cheerio";
class GPTService {
  constructor() {
    this.url = ["https://bartai.org/wp-admin/admin-ajax.php", "https://chatgbt.one/wp-admin/admin-ajax.php", "https://chatgptt.me/wp-admin/admin-ajax.php"];
  }
  async getInfo(type = 0) {
    const baseUrl = this.url[type]?.split("/wp-admin")[0] || this.url[0].split("/wp-admin")[0];
    const html = await (await fetch(baseUrl)).text();
    const $ = cheerio.load(html);
    return $(".wpaicg-chat-shortcode").map((index, element) => Object.fromEntries(Object.entries(element.attribs))).get();
  }
  async gptAudio(audioUrl, type = 0) {
    const info = JSON.parse(await this.getInfo(type) || "[]");
    const data = new FormData();
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error("Failed to fetch audio from URL");
    const audioBuffer = await audioResponse.arrayBuffer();
    const blob = new Blob([audioBuffer], {
      type: "audio/mpeg"
    });
    const nonce = info[0]?.["data-nonce"] || "";
    const postId = info[0]?.["data-post-id"] || "";
    data.append("_wpnonce", nonce);
    data.append("post_id", postId);
    data.append("action", "wpaicg_chatbox_message");
    data.append("audio", blob, "wpaicg-chat-recording.wav");
    const response = await fetch(this.url[type], {
      method: "POST",
      body: data
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.text();
  }
  async gptChat(prompt, type = 0) {
    const info = JSON.parse(await this.getInfo(type) || "[]");
    const data = new FormData();
    const nonce = info[0]?.["data-nonce"] || "";
    const postId = info[0]?.["data-post-id"] || "";
    data.append("_wpnonce", nonce);
    data.append("post_id", postId);
    data.append("action", "wpaicg_chatbox_message");
    data.append("message", prompt);
    const response = await fetch(this.url[type], {
      method: "POST",
      body: data
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.text();
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    url,
    type
  } = req.method === "GET" ? req.query : req.body;
  const gptService = new GPTService();
  const typeIndex = parseInt(type, 10) || 0;
  try {
    if (action === "chat" && prompt) {
      const result = await gptService.gptChat(prompt, typeIndex);
      return res.status(200).json({
        result: result
      });
    }
    if (action === "audio" && url) {
      const result = await gptService.gptAudio(url, typeIndex);
      return res.status(200).json({
        result: result
      });
    }
    return res.status(400).json({
      error: "Invalid parameters or missing required fields"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}