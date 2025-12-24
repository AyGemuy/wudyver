import axios from "axios";
import {
  load
} from "cheerio";
import {
  randomUUID
} from "crypto";
class BotifyAI {
  constructor() {
    this.apiKey = null;
    this.strapiToken = null;
    this.chatToken = null;
    this.gmpId = null;
    this.firebaseIdToken = null;
    this.localId = null;
    this.accessToken = null;
    this.sessionToken = null;
    this.chatId = null;
    this.chatContext = [];
    this.initPromise = null;
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://botify.ai",
      referer: "https://botify.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async _fetchConfig() {
    try {
      const mainPageUrl = "https://botify.ai";
      const mainPageResponse = await axios.get(mainPageUrl, {
        headers: this.defaultHeaders
      });
      const $ = load(mainPageResponse.data);
      let mainJsUrl = "";
      $("script[src]").each((i, el) => {
        const src = $(el).attr("src") || "";
        if (src.includes("/static/js/main")) {
          mainJsUrl = new URL(src, mainPageUrl).href;
          return false;
        }
      });
      if (!mainJsUrl) throw new Error("File JS utama tidak ditemukan.");
      const jsContent = (await axios.get(mainJsUrl)).data;
      this.apiKey = jsContent.match(/AIzaSy[A-Za-z0-9\-_]{33}/)?.[0];
      this.strapiToken = jsContent.match(/[a-f0-9]{256}/)?.[0];
      this.chatToken = jsContent.match(/eyJhbGciOiJIUzUxMiJ9\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/)?.[0];
      this.gmpId = jsContent.match(/1:\d+:web:[a-f0-9]+/)?.[0];
      if (!this.apiKey || !this.strapiToken || !this.chatToken || !this.gmpId) {
        throw new Error("Gagal mengekstrak semua token yang diperlukan.");
      }
    } catch (error) {
      throw new Error(`Gagal mengambil konfigurasi: ${error.message}`);
    }
  }
  async _register() {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`;
      const data = {
        returnSecureToken: true
      };
      const headers = {
        ...this.defaultHeaders,
        "content-type": "application/json",
        "x-firebase-gmpid": this.gmpId
      };
      const response = await axios.post(url, data, {
        headers: headers
      });
      this.firebaseIdToken = response.data.idToken;
      this.localId = response.data.localId;
    } catch (error) {
      throw new Error(`Gagal mendaftar Firebase: ${error.response?.data?.error?.message || error.message}`);
    }
  }
  async _login() {
    try {
      if (!this.firebaseIdToken) throw new Error("firebaseIdToken tidak tersedia untuk login.");
      const url = "https://api.botify.ai/chatbot/v2/users/login";
      const data = {
        token: this.firebaseIdToken,
        analytics: null
      };
      const headers = {
        ...this.defaultHeaders,
        "content-type": "application/json",
        "sec-fetch-site": "same-site"
      };
      const response = await axios.post(url, data, {
        headers: headers
      });
      this.accessToken = response.data.accessToken;
    } catch (error) {
      throw new Error(`Gagal login: ${error.message}`);
    }
  }
  async _getSession() {
    try {
      if (!this.localId) throw new Error("localId tidak tersedia untuk mengambil sesi.");
      const url = `https://api.exh.ai/strapi-secondary/api/user-helper/session/${this.localId}`;
      const headers = {
        ...this.defaultHeaders,
        authorization: `Bearer ${this.strapiToken}`
      };
      const response = await axios.get(url, {
        headers: headers
      });
      this.sessionToken = response.data.token;
    } catch (error) {
      throw new Error(`Gagal mengambil sesi: ${error.message}`);
    }
  }
  async _initialize() {
    console.log("\n===== MEMULAI INISIALISASI OTOMATIS =====");
    try {
      await this._fetchConfig();
      await this._register();
      await this._login();
      await this._getSession();
      console.log("===== INISIALISASI BERHASIL =====\n");
    } catch (error) {
      console.error("\n===== INISIALISASI GAGAL TOTAL =====");
      this.initPromise = null;
      throw error;
    }
  }
  async _ensureInit() {
    if (!this.initPromise) {
      this.initPromise = this._initialize();
    }
    await this.initPromise;
  }
  async search({
    query = "",
    page = 1
  }) {
    await this._ensureInit();
    console.log(`[PROSES] Mencari bot dengan query "${query}"...`);
    try {
      const url = "https://api.exh.ai/strapi-secondary/api/bots";
      const params = new URLSearchParams({
        "filters[$or][0][name][$containsi]": query,
        "filters[$or][1][bio][$containsi]": query,
        "pagination[page]": page,
        "sort[0]": "messagesCount:desc"
      });
      const headers = {
        ...this.defaultHeaders,
        authorization: `Bearer ${this.strapiToken}`,
        user: this.sessionToken,
        "x-auth-token": this.accessToken
      };
      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: headers
      });
      console.log(`[OK] Pencarian "${query}" berhasil.`);
      return response.data;
    } catch (error) {
      console.error(`[ERROR] Gagal mencari: ${error.message}`);
      throw error;
    }
  }
  async chat({
    botId = "1205066",
    botName = "Dating Coach",
    prompt: message = ""
  }) {
    await this._ensureInit();
    try {
      if (!this.chatId) {
        this.chatId = `${randomUUID()}_strapi_chat_id`;
        this.chatContext = [];
        console.log(`\n[INFO] Sesi chat baru dengan ${botName} (ID: ${this.chatId})`);
        const greeting = await this._fetchReply({
          botId: botId,
          context: []
        });
        const greetingMsg = greeting.responses?.[0] || {};
        await this._saveMessage({
          botName: botName,
          ...greetingMsg,
          text: greetingMsg.response,
          type: "bot",
          senderId: botId,
          senderName: botName
        });
        this.chatContext.push({
          message: greetingMsg.response,
          turn: "bot",
          media_id: greetingMsg.media_response?.media_id || null
        });
        console.log(`[BOT] ${greetingMsg.response}`);
      }
      console.log(`[USER] ${message}`);
      await this._saveMessage({
        botName: botName,
        text: message,
        type: "user",
        senderId: this.localId
      });
      this.chatContext.push({
        message: message,
        turn: "user",
        media_id: null
      });
      const reply = await this._fetchReply({
        botId: botId,
        context: this.chatContext
      });
      const replyMsg = reply.responses?.[0] || {};
      await this._saveMessage({
        botName: botName,
        ...replyMsg,
        text: replyMsg.response,
        type: "bot",
        senderId: botId,
        senderName: botName
      });
      this.chatContext.push({
        message: replyMsg.response,
        turn: "bot",
        media_id: replyMsg.media_response?.media_id || null
      });
      console.log(`[BOT] ${replyMsg.response}`);
      return replyMsg;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam alur chat: ${error.message}`);
      throw error;
    }
  }
  async _fetchReply({
    botId,
    context = []
  }) {
    try {
      const url = "https://api.exh.ai/chatbot/v4/botify/response";
      const data = {
        context: context,
        strapi_bot_id: botId,
        output_audio: false,
        enable_proactive_photos: true
      };
      const headers = {
        ...this.defaultHeaders,
        "content-type": "application/json",
        authorization: `Bearer ${this.chatToken}`,
        "x-auth-token": this.accessToken
      };
      return (await axios.post(url, data, {
        headers: headers
      })).data;
    } catch (error) {
      throw new Error(`Gagal mengambil balasan bot: ${error.message}`);
    }
  }
  async _saveMessage(msgDetails) {
    try {
      const {
        botName,
        text,
        type,
        senderId,
        senderName,
        mediaResponse = null,
        split = null
      } = msgDetails;
      const url = `https://api.botify.ai/chatbot/v2/chats/${this.chatId}/messages`;
      const payload = {
        botName: botName,
        text: text,
        type: type,
        senderId: senderId,
        senderName: senderName,
        createdAt: Date.now() / 1e3,
        isEdited: false,
        isDeleted: false,
        isSexting: false,
        ...mediaResponse && {
          mediaResponse: mediaResponse
        },
        ...split && {
          split: split
        }
      };
      const headers = {
        ...this.defaultHeaders,
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
        "x-auth-token": this.accessToken,
        "sec-fetch-site": "same-site"
      };
      return (await axios.post(url, payload, {
        headers: headers
      })).data;
    } catch (error) {
      throw new Error(`Gagal menyimpan pesan: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "chat | search"
      }
    });
  }
  const botify = new BotifyAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await botify[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await botify[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | search`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}