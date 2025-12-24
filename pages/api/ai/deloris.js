import crypto from "crypto";
import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class DelorisAI {
  constructor(baseURL = "https://api.deloris-ai.com") {
    this.baseURL = baseURL;
    this.token = null;
    this.templateId = null;
    this.headers = this.buildHeaders();
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseURL,
      referer: `${this.baseURL}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
    console.log("Headers dibangun:", headers);
    return headers;
  }
  async ensureToken() {
    if (!this.token) {
      await this.getToken();
    }
  }
  async ensureTemplateId(char_id) {
    if (!this.templateId && char_id) {
      await this.getTemplate(char_id);
    } else if (!char_id) {
      console.warn("Character ID tidak disediakan, tidak dapat mengambil template ID.");
    }
  }
  async getToken() {
    try {
      console.log("Memulai proses pengambilan token...");
      const userId = crypto.randomUUID();
      const response = await axios.post(`${this.baseURL}/api/v1/users/guest_auth`, {
        user_id: userId,
        channel: "google"
      }, {
        headers: {
          ...this.headers,
          authorization: "Bearer"
        }
      });
      if (response.data && response.data.data && response.data.data.token) {
        this.token = response.data.data.token;
        console.log("Token berhasil diambil:", this.token, "dengan User ID:", userId);
        return this.token;
      } else {
        console.error("Gagal mengambil token: Respons tidak sesuai", response.data);
        throw new Error("Gagal mengambil token: Respons tidak sesuai");
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil token:", error);
      throw error;
    }
  }
  async getTemplate(id) {
    try {
      await this.ensureToken();
      console.log("Memulai proses pengambilan template ID untuk:", id);
      const response = await axios.post(`${this.baseURL}/api/v1/chats/`, {
        bot_template: id,
        topic: id
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        }
      });
      if (response.data && response.data.data && response.data.data.id) {
        this.templateId = response.data.data.id;
        console.log("Template ID berhasil diambil:", this.templateId, "untuk bot:", id);
        return this.templateId;
      } else {
        console.error("Gagal mengambil template ID: Respons tidak sesuai", response.data);
        throw new Error("Gagal mengambil template ID: Respons tidak sesuai");
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil template ID:", error);
      throw error;
    }
  }
  async search({
    interested_in = "Female",
    style = "Anime",
    page = 1
  }) {
    try {
      await this.ensureToken();
      console.log("Memulai pencarian...");
      const response = await axios.post(`${this.baseURL}/api/v1/sys/pagination_personalization-bot-templates`, {
        page: page,
        encoded_uuids: [],
        interested_in: interested_in,
        style: style
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        }
      });
      console.log("Pencarian berhasil:", response.data);
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat melakukan pencarian:", error);
      throw error;
    }
  }
  async chat({
    prompt = "say hello",
    char_id = "019534ef-2ddc-7fc6-9cc5-da0ff8dd2fc6",
    save_user = true
  }) {
    try {
      await this.ensureToken();
      await this.ensureTemplateId(char_id);
      if (!this.templateId) {
        throw new Error("Template ID tidak tersedia, tidak dapat memulai chat.");
      }
      console.log("Memulai proses chat...");
      const response = await axios.post(`${this.baseURL}/api/v1/chats/message`, {
        content: prompt,
        chat: this.templateId,
        save_user_message: save_user
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        }
      });
      let result = "";
      if (response.data && typeof response.data === "string") {
        const chunks = response.data.split("\n").filter(line => line.startsWith("data: "));
        chunks.forEach(chunkLine => {
          try {
            const jsonData = JSON.parse(chunkLine.substring(6));
            if (jsonData.chunk !== undefined) {
              result += jsonData.chunk;
            }
            if (jsonData.status === "finished") {
              console.log("Chat selesai.");
            }
          } catch (error) {
            console.error("Gagal memparse chunk JSON:", error, chunkLine);
          }
        });
        console.log("Chat berhasil, hasil:", {
          result: result
        });
        return {
          result: result
        };
      } else {
        console.log("Respons chat:", response.data);
        return response.data;
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat melakukan chat:", error);
      throw error;
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
  const client = new DelorisAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "search":
        result = await client[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}