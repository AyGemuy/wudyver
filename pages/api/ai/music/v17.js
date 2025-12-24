import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
const log = (msg, ...args) => console.log(`[${new Date().toISOString()}] ${msg}`, ...args);
class SongdioBot {
  constructor() {
    this.baseTempMail = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.baseSongdio = "https://songdio.app";
    this.email = null;
    this.csrfToken = null;
    this.userUuid = null;
    this.cookie = null;
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.http.interceptors.request.use(config => {
      log("Request:", config.method?.toUpperCase(), config.url);
      return config;
    });
    this.http.interceptors.response.use(res => {
      log("Response:", res.status, res.config.url);
      return res;
    });
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  buildHeader(extra = {}) {
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://songdio.app",
      priority: "u=1, i",
      referer: "https://songdio.app/creations",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead(),
      ...extra
    };
  }
  async createTempMail() {
    try {
      const {
        data
      } = await this.http.get(`${this.baseTempMail}?action=create`);
      log("Data respons createTempMail:", data);
      if (!data.email) throw new Error("Tidak ada email yang diterima");
      this.email = data.email;
      log("Email sementara dibuat:", this.email);
    } catch (err) {
      throw new Error(`createTempMail: ${err.message}`);
    }
  }
  async getCSRF() {
    try {
      const {
        data
      } = await this.http.get(`${this.baseSongdio}/api/auth/csrf`);
      log("Data respons getCSRF:", data);
      if (!data.csrfToken) throw new Error("Token CSRF tidak ditemukan");
      this.csrfToken = data.csrfToken;
      log("Token CSRF didapatkan.");
    } catch (err) {
      throw new Error(`getCSRF: ${err.message}`);
    }
  }
  async sendSigninEmail() {
    try {
      const body = new URLSearchParams({
        email: this.email,
        redirect: "false",
        callbackUrl: "https://songdio.app/",
        csrfToken: this.csrfToken,
        json: "true"
      });
      const response = await this.http.post(`${this.baseSongdio}/api/auth/signin/email`, body, {
        headers: this.buildHeader({
          "content-type": "application/x-www-form-urlencoded"
        })
      });
      log("Data respons sendSigninEmail:", response.data);
      log("Email sign-in telah dikirim.");
    } catch (err) {
      throw new Error(`sendSigninEmail: ${err.message}`);
    }
  }
  async waitVerifyLink(maxWait = 6e4) {
    try {
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const {
          data
        } = await this.http.get(`${this.baseTempMail}?action=message&email=${encodeURIComponent(this.email)}`);
        log("Data polling waitVerifyLink:", data);
        const link = data.data?.[0]?.text_content?.match(/https:\/\/songdio\.app\/api\/auth\/callback\/email\?[^ \r\n]+/)?.[0];
        if (link) {
          log("Tautan verifikasi ditemukan.");
          return link;
        }
        await new Promise(r => setTimeout(r, 3e3));
      }
      throw new Error("Tidak ada tautan verifikasi ditemukan");
    } catch (err) {
      throw new Error(`waitVerifyLink: ${err.message}`);
    }
  }
  async followVerifyLink(link) {
    try {
      const response1 = await this.http.get(link, {
        maxRedirects: 10,
        headers: this.buildHeader({
          accept: "text/html"
        })
      });
      log("Data respons followVerifyLink (redirect):", response1.data);
      const response2 = await this.http.get(`${this.baseSongdio}/api/auth/session`, {
        headers: this.buildHeader()
      });
      log("Data respons followVerifyLink (session):", response2.data);
      this.userUuid = response2.data?.user?.uuid;
      if (!this.userUuid) throw new Error("UUID pengguna tidak ditemukan dalam sesi");
      log("Berhasil mengikuti tautan verifikasi dan membuat sesi.");
    } catch (err) {
      throw new Error(`followVerifyLink: ${err.message}`);
    }
  }
  async updateLocale(locale = "en") {
    try {
      const response = await this.http.post(`${this.baseSongdio}/api/update-user-locale`, null, {
        headers: this.buildHeader({
          "content-length": "0",
          "x-locale": locale
        })
      });
      log("Data respons updateLocale:", response.data);
      log(`Locale diperbarui menjadi ${locale}.`);
    } catch (err) {
      throw new Error(`updateLocale: ${err.message}`);
    }
  }
  async getUserCredits() {
    try {
      const {
        data
      } = await this.http.post(`${this.baseSongdio}/api/get-user-credits`, null, {
        headers: this.buildHeader({
          "content-length": "0"
        })
      });
      log("Data respons getUserCredits:", data);
      log("Kredit pengguna didapatkan:", data);
      return data;
    } catch (err) {
      throw new Error(`getUserCredits: ${err.message}`);
    }
  }
  async createMusic({
    title = "Epic Orchestral Score",
    lyrics = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    tags = "electronic,classical",
    model = "chirp-v3-5",
    description = ""
  }) {
    try {
      const response = await this.http.post(`${this.baseSongdio}/api/ace-gen-song`, {
        title: title,
        lyrics: lyrics,
        tags: tags,
        description: description,
        is_no_lyrics: false,
        mode: "custom",
        user_uuid: this.userUuid,
        model: model
      }, {
        headers: this.buildHeader()
      });
      log("Data respons createMusic:", response.data);
      log("Permintaan pembuatan musik berhasil.");
      this.cookie = await this.jar.getCookieString(this.baseSongdio);
      return response.data;
    } catch (err) {
      throw new Error(`createMusic: ${err.message}`);
    }
  }
  async create({
    title,
    lyrics,
    tags,
    model
  }) {
    await this.createTempMail();
    await this.getCSRF();
    await this.sendSigninEmail();
    const verifyLink = await this.waitVerifyLink();
    await this.followVerifyLink(verifyLink);
    await this.updateLocale("en");
    const userCredits = await this.getUserCredits();
    if (userCredits?.data?.left_credits > 0) {
      const musicResult = await this.createMusic({
        title: title,
        lyrics: lyrics,
        tags: tags,
        model: model
      });
      const cookieStr = this.cookie;
      const task_id = await this.enc({
        taskId: musicResult.data.taskId,
        userId: this.userUuid,
        cookie: cookieStr
      });
      return {
        task_id: task_id
      };
    } else {
      log("Tidak ada kredit yang tersedia untuk membuat musik.");
      return {
        task_id: null,
        user_id: this.userUuid,
        cookie: null
      };
    }
  }
  async status({
    task_id,
    page = 1,
    limit = 30
  }) {
    try {
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        taskId,
        userId,
        cookie
      } = decryptedData;
      if (!taskId || !userId || !cookie) {
        throw new Error("Invalid task_id: Missing required data after decryption.");
      }
      this.cookie = cookie;
      const songsResponse = await this.http.post(`${this.baseSongdio}/api/get-created-songs`, {
        page: page,
        limit: limit
      }, {
        headers: this.buildHeader({
          cookie: this.cookie
        })
      });
      log("All songs response:", songsResponse.data);
      if (!songsResponse.data.success || !songsResponse.data.data) {
        throw new Error("Failed to fetch songs list");
      }
      const allApiTaskIds = [...new Set(songsResponse.data.data.filter(song => song.apiTaskId).map(song => song.apiTaskId))];
      const allTaskStatuses = [];
      for (const apiTaskId of allApiTaskIds) {
        try {
          const {
            data
          } = await this.http.post(`${this.baseSongdio}/api/ace-gen-song/task`, {
            task_ids: [apiTaskId]
          }, {
            headers: this.buildHeader({
              cookie: this.cookie
            })
          });
          log(`Status for task ${apiTaskId}:`, data);
          allTaskStatuses.push({
            apiTaskId: apiTaskId,
            status: data
          });
        } catch (err) {
          log(`Error checking status for task ${apiTaskId}:`, err.message);
          allTaskStatuses.push({
            apiTaskId: apiTaskId,
            error: err.message
          });
        }
      }
      return {
        allSongs: songsResponse.data.data,
        allTaskStatuses: allTaskStatuses
      };
    } catch (err) {
      throw new Error(`status: ${err.message}`);
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
      error: "Action (create or status) is required."
    });
  }
  const generator = new SongdioBot();
  try {
    switch (action) {
      case "create":
        if (!params.lyrics) {
          return res.status(400).json({
            error: "lyrics is required for 'create' action."
          });
        }
        const createResponse = await generator.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await generator.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}