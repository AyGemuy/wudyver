import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import SpoofHead from "@/lib/spoof-head";
class Lovescape {
  constructor() {
    console.log("Log: Inisialisasi Lovescape");
    this.cookieJar = new CookieJar();
    this.client = axios.create({
      baseURL: "https://lovescape.com/api/front",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "text/plain;charset=UTF-8",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        origin: "https://lovescape.com",
        referer: "https://lovescape.com/",
        priority: "u=1, i",
        ...SpoofHead()
      }
    });
    this.client.interceptors.request.use(async config => {
      const fullUrl = config.baseURL && config.url ? `${config.baseURL}${config.url.startsWith("/") ? config.url : `/${config.url}`}` : "https://lovescape.com";
      const cookies = await this.cookieJar.getCookieString(fullUrl);
      if (cookies) config.headers.Cookie = cookies;
      console.log(`Log: Mengirim request ke ${fullUrl}`);
      return config;
    });
    this.client.interceptors.response.use(async response => {
      const setCookie = response.headers["set-cookie"];
      const fullUrl = response.config.baseURL && response.config.url ? `${response.config.baseURL}${response.config.url.startsWith("/") ? response.config.url : `/${response.config.url}`}` : "https://lovescape.com";
      if (setCookie) {
        console.log("Log: Menyimpan cookie dari response");
        await Promise.all(setCookie.map(cookie => this.cookieJar.setCookie(cookie, fullUrl)));
      }
      return response;
    });
    this.guest = null;
    this.uniq = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    console.log(`Log: Generated uniq value: ${this.uniq}`);
  }
  async poll({
    fetchFn,
    checkCondition,
    interval = 3e3,
    maxAttempts = 60
  }) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await fetchFn();
        if (checkCondition(response)) {
          console.log(`Log: Polling berhasil setelah ${attempts + 1} percobaan`);
          return response;
        }
        console.log(`Log: Polling attempt ${attempts + 1}/${maxAttempts}, kondisi belum terpenuhi`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (err) {
        console.error(`Error pada polling attempt ${attempts + 1}:`, err.message);
        throw err;
      }
    }
    throw new Error(`Polling gagal setelah ${maxAttempts} percobaan`);
  }
  async init() {
    console.log("Log: Mengambil data guest");
    try {
      const res = await this.client.get(`/v2/config/data?timezoneOffset=-480&uniq=${this.uniq}`);
      this.guest = res.data?.data;
      console.log(`Log: Guest data diambil, guestUuid: ${this.guest?.guestUuid}`);
      return this.guest;
    } catch (err) {
      console.error("Error inisialisasi:", err.message);
      throw err;
    }
  }
  async ensureInit() {
    if (!this.guest) {
      await this.init();
    }
  }
  async chat({
    prompt,
    userId = "3829229",
    isChatWithTwin = true,
    ...rest
  }) {
    await this.ensureInit();
    console.log(`Log: Mengirim pesan ke user ${userId}`);
    try {
      const guestUuid = this.guest?.guestUuid || "default-guest-uuid";
      const chatRes = await this.client.post(`/guests/users/${userId}/conversations/messages?uniq=${this.uniq}`, {
        body: prompt,
        details: {
          clientId: `client_${Date.now()}`
        },
        isChatWithTwin: isChatWithTwin,
        ampl: rest.ampl ?? {
          device_id: guestUuid,
          session_id: Date.now(),
          ep: {
            page: "chat",
            project: "Lovescape",
            isCookieAccepted: true,
            displayMode: "browser"
          }
        }
      });
      console.log("Log: Pesan terkirim");
      const conversationId = chatRes.data?.message?.conversationId;
      const sentMessageTime = chatRes.data?.message?.createdAt || new Date().toISOString();
      if (conversationId && userId && guestUuid) {
        console.log(`Log: Otomatis polling pesan untuk percakapan ${conversationId}`);
        const convRes = await this.getConversationMessages({
          currentUserId: userId,
          generatedUuid: guestUuid,
          lastMessageTime: sentMessageTime
        });
        return {
          chat: chatRes.data,
          conversationMessages: convRes
        };
      }
      return {
        chat: chatRes.data
      };
    } catch (err) {
      console.error("Error chat:", err.message);
      throw err;
    }
  }
  async image({
    prompt,
    ...rest
  }) {
    await this.ensureInit();
    console.log("Log: Membuat gambar");
    try {
      const guestUuid = this.guest?.guestUuid || "default-guest-uuid";
      const imgRes = await this.client.post(`/guests/${guestUuid}/custom-photo-generations?uniq=${this.uniq}`, {
        storyPrompt: prompt,
        imageStyle: rest.imageStyle || "realistic",
        imageStylePreset: rest.imageStylePreset ?? null,
        sfw: rest.sfw === false ? false : true,
        generationId: Date.now(),
        batchSize: rest.batchSize || 1,
        gender: rest.gender || "female",
        faceDiversity: rest.faceDiversity || "default",
        promptType: rest.promptType || "no_character",
        ampl: rest.ampl ?? {
          device_id: guestUuid,
          session_id: Date.now(),
          ep: {
            page: "video-generation",
            project: "Lovescape",
            isCookieAccepted: true,
            displayMode: "browser"
          }
        }
      });
      console.log("Log: Gambar dibuat");
      console.log(`Log: Otomatis polling daftar media untuk guest ${guestUuid}`);
      const mediaRes = await this.getMediaList({
        guestUuid: guestUuid
      });
      return {
        image: imgRes.data,
        mediaList: mediaRes
      };
    } catch (err) {
      console.error("Error membuat gambar:", err.message);
      throw err;
    }
  }
  async getMediaList({
    guestUuid,
    ...rest
  }) {
    console.log(`Log: Mengambil daftar media untuk guest ${guestUuid}`);
    try {
      const fetchMediaList = async () => {
        const res = await this.client.get(`/guests/${guestUuid}/media/list?uniq=${this.uniq}`, {
          params: rest
        });
        return res.data;
      };
      const checkMediaList = response => Array.isArray(response.urls) && response.urls.length > 0;
      const response = await this.poll({
        fetchFn: fetchMediaList,
        checkCondition: checkMediaList,
        interval: 5e3,
        maxAttempts: 6
      });
      console.log("Log: Daftar media diambil");
      return response;
    } catch (err) {
      console.error("Error mengambil daftar media:", err.message);
      throw err;
    }
  }
  async getConversationMessages({
    currentUserId,
    generatedUuid,
    lastMessageTime,
    ...rest
  }) {
    console.log(`Log: Mengambil pesan untuk user ${currentUserId}`);
    try {
      const fetchMessages = async () => {
        const params = new URLSearchParams({
          uniq: this.uniq,
          ...rest
        });
        const res = await this.client.get(`/guests/users/${currentUserId}/conversations/messages?${params.toString()}`);
        return res.data;
      };
      const checkNewMessages = response => {
        if (!Array.isArray(response.messages)) return false;
        if (!lastMessageTime) return response.messages.length > 0;
        const lastTime = new Date(lastMessageTime).getTime();
        return response.messages.some(msg => new Date(msg.createdAt).getTime() > lastTime);
      };
      const response = await this.poll({
        fetchFn: fetchMessages,
        checkCondition: checkNewMessages,
        interval: 5e3,
        maxAttempts: 6
      });
      console.log("Log: Pesan diambil");
      return response;
    } catch (err) {
      console.error("Error mengambil pesan:", err.message);
      throw err;
    }
  }
  async discover({
    ...rest
  }) {
    await this.ensureInit();
    console.log("Log: Mencari karakter");
    try {
      const params = new URLSearchParams({
        limit: rest.limit || 19,
        offset: rest.offset || 0,
        "excludes[0]": "intro",
        uniq: this.uniq,
        ...rest.tags ? Object.fromEntries(rest.tags.map((tag, i) => [`tags[${i}]`, tag])) : {
          "tags[0]": "featured",
          "tags[1]": "female",
          "tags[2]": "realistic",
          "tags[3]": "sfw"
        }
      });
      const res = await this.client.get(`/users/ai-persons/discover?${params.toString()}`);
      console.log("Log: Karakter ditemukan");
      return res.data;
    } catch (err) {
      console.error("Error discover:", err.message);
      throw err;
    }
  }
  async category({
    ...rest
  }) {
    await this.ensureInit();
    console.log("Log: Mengambil kategori");
    try {
      const params = new URLSearchParams({
        limit: rest.limit || 11,
        offset: rest.offset || 0,
        "excludes[0]": "intro",
        sfw: rest.sfw === false ? false : true,
        boost: rest.boost === false ? false : true,
        uniq: this.uniq,
        ...rest.tags ? Object.fromEntries(rest.tags.map((tag, i) => [`tags[${i}]`, tag])) : {
          "tags[0]": "exclusive"
        }
      });
      const res = await this.client.get(`/users/ai-persons/v2/discover/category?${params.toString()}`);
      console.log("Log: Kategori diambil");
      return res.data;
    } catch (err) {
      console.error("Error kategori:", err.message);
      throw err;
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new Lovescape();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'image'."
          });
        }
        response = await api.image(params);
        break;
      case "discover":
        response = await api.discover(params);
        break;
      case "category":
        response = await api.category(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'chat', 'image', 'discover', 'category'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}