import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class UnlimAI {
  constructor() {
    this.baseUrl = "https://unlimitedai.org";
    this.ajaxUrl = `${this.baseUrl}/wp-admin/admin-ajax.php`;
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      baseURL: this.baseUrl,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/`,
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      timeout: 3e4
    }));
    this.history = [];
    this.config = null;
    this.clientId = crypto.randomBytes(5).toString("hex");
  }
  async _fetchConfig() {
    try {
      console.log("[UnlimAI] [Process] Fetching nonce and configuration from homepage...");
      const {
        data
      } = await this.http.get("/");
      const $ = cheerio.load(data);
      const el = $(".wpaicg-chat-shortcode");
      if (!el.length) throw new Error("Chat element not found on page");
      this.config = {
        nonce: el.attr("data-nonce") || "",
        postId: el.attr("data-post-id") || "18",
        url: el.attr("data-url") || this.baseUrl
      };
      console.log(`[UnlimAI] [Success] Config loaded. Nonce: ${this.config.nonce}`);
      return this.config;
    } catch (e) {
      console.error(`[UnlimAI] [Error] Failed to fetch config: ${e.message}`);
      throw e;
    }
  }
  async generate({
    mode = "chat",
    prompt = "",
    ratio = "1:1",
    hd = "1",
    ...rest
  }) {
    try {
      const conf = this.config || await this._fetchConfig();
      const isChat = mode === "chat";
      const chatId = crypto.randomInt(1e3, 99999);
      console.log(`[UnlimAI] [Process] Starting ${mode.toUpperCase()} generation...`);
      const payload = new URLSearchParams({
        _wpnonce: conf.nonce,
        post_id: conf.postId,
        url: conf.url,
        action: isChat ? "wpaicg_chat_shortcode_message" : "generate_image",
        [isChat ? "message" : "prompt"]: prompt,
        bot_id: "0",
        chatbot_identity: "shortcode",
        ...isChat ? {
          wpaicg_chat_history: JSON.stringify(this.history),
          wpaicg_chat_client_id: this.clientId,
          chat_id: chatId
        } : {
          aspect_ratio: ratio,
          hd: hd
        },
        ...rest
      });
      const response = await this.http.post(this.ajaxUrl, payload.toString(), {
        responseType: isChat ? "text" : "json"
      });
      console.log(`[UnlimAI] [Success] Server responded for ${mode}.`);
      if (isChat) {
        const text = this._parseStream(response.data);
        this.history.push({
          id: "",
          text: `Human: ${prompt}`
        }, {
          id: chatId,
          text: `AI: ${text}`
        });
        return {
          result: text,
          chat_id: chatId,
          history_count: this.history.length,
          mode: mode
        };
      }
      return {
        result: response.data,
        prompt: prompt,
        aspect_ratio: ratio,
        mode: mode
      };
    } catch (e) {
      if (e.response?.status === 403) {
        console.warn("[UnlimAI] [Warning] Nonce expired (403). Retrying with fresh config...");
        this.config = null;
        return this.generate({
          mode: mode,
          prompt: prompt,
          ratio: ratio,
          hd: hd,
          ...rest
        });
      }
      console.error(`[UnlimAI] [Error] Generation failed: ${e.message}`);
      throw {
        error: true,
        message: e.message,
        status: e.response?.status || 500,
        ...rest
      };
    }
  }
  _parseStream(raw) {
    try {
      if (typeof raw !== "string") return raw;
      return raw.split("\n").filter(l => l.startsWith("data: ") && !l.includes("[DONE]")).map(l => {
        try {
          return JSON.parse(l.slice(6)).choices[0]?.delta?.content || "";
        } catch {
          return "";
        }
      }).join("").trim();
    } catch (e) {
      console.error("[UnlimAI] [Error] Parsing stream failed");
      return raw;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new UnlimAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}