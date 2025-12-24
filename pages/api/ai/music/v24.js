import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookieJarSupport
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const wudysoftApiClient = axios.create({
  baseURL: `https://${apiConfig.DOMAIN_URL}/api`
});
class WudysoftAPI {
  constructor() {
    this.client = wudysoftApiClient;
  }
  async createPaste(title, content) {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "create",
          title: title,
          content: content
        }
      });
      console.log("WudysoftAPI.createPaste - Respons Data:", JSON.stringify(response.data, null, 2));
      return response.data?.key || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createPaste': ${error.message}`);
      throw error;
    }
  }
  async getPaste(key) {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "get",
          key: key
        }
      });
      return response.data?.content || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.getPaste' untuk kunci ${key}: ${error.message}`);
      return null;
    }
  }
  async listPastes() {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "list"
        }
      });
      console.log("WudysoftAPI.listPastes - Respons Data:", JSON.stringify(response.data, null, 2));
      return response.data || [];
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.listPastes': ${error.message}`);
      return [];
    }
  }
  async delPaste(key) {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "delete",
          key: key
        }
      });
      return response.data || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.delPaste' untuk kunci ${key}: ${error.message}`);
      return null;
    }
  }
  async createEmail() {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      console.log("WudysoftAPI.createEmail - Respons Data:", JSON.stringify(response.data, null, 2));
      return response.data?.email || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createEmail': ${error.message}`);
      throw error;
    }
  }
  async checkMessages(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const messages = response.data?.data || [];
      for (const message of messages) {
        const match = message.text_content?.match(/verification code.*?(\d{6})/i) || message.text_content?.match(/(\d{6}).*?verification code/i);
        if (match) {
          console.log("OTP ditemukan:", match[1]);
          return match[1];
        }
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessages' untuk email ${email}: ${error.message}`);
      return null;
    }
  }
}
class EasyMusicAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = axios.create({
      baseURL: "https://pre1.easymusic.pages.dev",
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://pre1.easymusic.pages.dev",
        referer: "https://pre1.easymusic.pages.dev/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ...SpoofHead()
      }
    });
    axiosCookieJarSupport(this.client);
    this.wudysoftClient = new WudysoftAPI();
  }
  randomString(length, type = "alphanumeric") {
    const chars = {
      alphanumeric: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      numeric: "0123456789",
      alphabetic: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
      password: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()"
    };
    const charSet = chars[type] || chars.alphanumeric;
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    return result;
  }
  async uploadSession(serializedJar) {
    console.log("Mengunggah sesi cookie jar...");
    const title = `easymusic-${this.randomString(10)}`;
    const content = JSON.stringify({
      cookieJar: serializedJar,
      timestamp: new Date().toISOString()
    });
    const key = await this.wudysoftClient.createPaste(title, content);
    if (!key) throw new Error("Gagal mendapatkan kunci dari respons unggahan sesi.");
    console.log(`Sesi berhasil diunggah dengan kunci: ${key}`);
    return key;
  }
  async getSession(key) {
    console.log(`Mengambil sesi untuk kunci: ${key}...`);
    const contentString = await this.wudysoftClient.getPaste(key);
    if (!contentString) return null;
    return JSON.parse(contentString);
  }
  async listKeys() {
    console.log("Mengambil daftar kunci...");
    const allPastes = await this.wudysoftClient.listPastes();
    const easymusicKeys = allPastes.filter(paste => paste?.title?.startsWith("easymusic-")).map(paste => ({
      key: paste.key,
      title: paste.title,
      created: paste.created
    }));
    console.log(`Ditemukan ${easymusicKeys.length} kunci easymusic.`);
    return easymusicKeys;
  }
  async delKey(key) {
    try {
      console.log(`Menghapus kunci: ${key}`);
      const responseDel = await this.wudysoftClient.delPaste(key);
      return responseDel;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'delKey': ${error.message}`);
      return null;
    }
  }
  async poll(fn, ms = 3e3, timeout = 12e4) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const result = await fn();
        if (result) return result;
        console.log("Polling: belum ada hasil, menunggu...");
        await new Promise(resolve => setTimeout(resolve, ms));
      } catch (error) {
        console.log("Polling error:", error.message);
        await new Promise(resolve => setTimeout(resolve, ms));
      }
    }
    throw new Error("Polling timeout");
  }
  async sendCode(email) {
    try {
      console.log("Mengirim kode verifikasi...");
      const response = await this.client.post("/api/auth/email/code", {
        email: email,
        type: "register"
      });
      console.log("Kode verifikasi dikirim");
      return response.data;
    } catch (error) {
      console.error("Gagal mengirim kode:", error.response?.data || error.message);
      throw error;
    }
  }
  async verifyCode(email, code) {
    try {
      console.log("Memverifikasi kode OTP...");
      const response = await this.client.post("/api/auth/email/verify", {
        email: email,
        code: code,
        type: "register"
      });
      console.log("Kode berhasil diverifikasi");
      return response.data;
    } catch (error) {
      console.error("Gagal verifikasi kode:", error.response?.data || error.message);
      throw error;
    }
  }
  async completeRegister(email, code) {
    try {
      console.log("Menyelesaikan registrasi...");
      const password = `${this.randomString(4, "alphabetic")}${this.randomString(2, "numeric")}${this.randomString(2, "password")}`;
      const response = await this.client.post("/api/auth/email/register", {
        email: email,
        code: code,
        password: password
      });
      console.log("Registrasi berhasil dengan password:", password);
      return {
        data: response.data,
        password: password
      };
    } catch (error) {
      console.error("Gagal registrasi:", error.response?.data || error.message);
      throw error;
    }
  }
  async login(email, password) {
    try {
      console.log("Melakukan login...");
      const response = await this.client.post("/auth/signin", [email, password], {
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "dffd93e59f7726b4f0d6b2f984bfa03ffd5ab79c"
        }
      });
      console.log("Login berhasil");
      return response.data;
    } catch (error) {
      console.error("Gagal login:", error.response?.data || error.message);
      throw error;
    }
  }
  async getSessionInfo() {
    try {
      console.log("Mendapatkan session info...");
      const response = await this.client.get("/api/auth/session");
      console.log("Session info didapatkan");
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan session:", error.response?.data || error.message);
      throw error;
    }
  }
  async register() {
    try {
      this.jar = new CookieJar();
      this.client.defaults.jar = this.jar;
      console.log("Memulai proses registrasi akun baru...");
      const email = await this.wudysoftClient.createEmail();
      if (!email) throw new Error("Gagal membuat email sementara.");
      await this.sendCode(email);
      const code = await this.poll(() => this.wudysoftClient.checkMessages(email), 3e3, 12e4);
      if (!code) throw new Error("Gagal mendapatkan OTP");
      await this.verifyCode(email, code);
      const registerResult = await this.completeRegister(email, code);
      await this.login(email, registerResult.password);
      await this.getSessionInfo();
      console.log("Registrasi dan autentikasi berhasil.");
      const serializedJar = this.jar.serializeSync();
      const key = await this.uploadSession(serializedJar);
      return {
        key: key,
        email: email,
        password: registerResult.password,
        cookieJar: serializedJar
      };
    } catch (error) {
      console.error(`[ERROR] Gagal total dalam proses 'register': ${error.message}`);
      if (error.response) {
        console.error("[ERROR] Detail Respons API:", JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }
  async ensureAuth(key) {
    try {
      if (key) {
        console.log("Menggunakan key yang diberikan:", key);
        const sessionData = await this.getSession(key);
        if (sessionData && sessionData.cookieJar) {
          this.jar = CookieJar.deserializeSync(sessionData.cookieJar);
          this.client.defaults.jar = this.jar;
          try {
            await this.getSessionInfo();
            console.log("Session valid");
            return key;
          } catch (error) {
            console.log("Session expired, membuat baru...");
          }
        }
      }
      console.log("Membuat session baru...");
      const newSession = await this.register();
      if (!newSession) throw new Error("Gagal membuat session baru");
      return newSession.key;
    } catch (error) {
      console.error("Gagal ensure auth:", error.message);
      throw error;
    }
  }
  async generate({
    key,
    prompt,
    style = "indie-pop, soulful",
    title = "Generated Song",
    ...rest
  }) {
    try {
      console.log("Memulai generate music...");
      const sessionKey = await this.ensureAuth(key);
      const response = await this.client.post("/api/music/generate", {
        prompt: prompt,
        style: style,
        title: title,
        isCustom: true,
        isInstrumental: false,
        model: "V4",
        src: null,
        ...rest
      });
      console.log("Generate request berhasil:", response.data);
      if (response.data?.code !== 0) {
        throw new Error(response.data?.error || "Generate gagal");
      }
      const taskInfo = await this.getTaskList();
      const taskId = taskInfo?.musics?.[0]?.id;
      if (!taskId) throw new Error("Gagal mendapatkan task ID");
      return {
        key: sessionKey,
        task_id: taskId,
        taskInfo: taskInfo
      };
    } catch (error) {
      console.error("Gagal generate:", error.message);
      throw error;
    }
  }
  async getTaskList(limit = 10) {
    try {
      console.log("Mendapatkan daftar task...");
      const response = await this.client.get("/api/music/list", {
        params: {
          limit: limit
        }
      });
      console.log("Daftar task didapatkan");
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan task list:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    key,
    task_id,
    ...rest
  }) {
    try {
      console.log("Mengecek status task:", task_id);
      await this.ensureAuth(key);
      const response = await this.client.post("/api/music/status", {
        musicIds: [task_id],
        ...rest
      });
      console.log("Status response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan status:", error.response?.data || error.message);
      throw error;
    }
  }
  async waitComplete({
    key,
    task_id,
    interval = 3e3,
    timeout = 12e4
  }) {
    try {
      console.log("Menunggu task selesai:", task_id);
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const status = await this.status({
          key: key,
          task_id: task_id
        });
        const task = status?.musics?.find(m => m.id === task_id);
        if (!task) {
          throw new Error("Task tidak ditemukan");
        }
        console.log(`Status task: ${task.state}`);
        if (task.state === "complete") {
          console.log("Task selesai");
          return task;
        }
        if (task.state === "failed") {
          throw new Error(`Task gagal: ${task.failed_reason || "Unknown error"}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      throw new Error("Timeout menunggu task selesai");
    } catch (error) {
      console.error("Gagal wait complete:", error.message);
      throw error;
    }
  }
  async getProfile(key) {
    try {
      console.log(`Mendapatkan profil untuk kunci: ${key}`);
      await this.ensureAuth(key);
      const sessionInfo = await this.getSessionInfo();
      const taskList = await this.getTaskList();
      return {
        session: sessionInfo,
        tasks: taskList
      };
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'getProfile': ${error.message}`);
      return null;
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
  const api = new EasyMusicAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "generate":
        if (!params.prompt) return res.status(400).json({
          error: "Paramenter 'prompt' wajib diisi untuk action 'generate'."
        });
        response = await api.generate(params);
        break;
      case "status":
        if (!params.key || !params.task_id) return res.status(400).json({
          error: "Paramenter 'key' dan 'task_id' wajib diisi untuk action 'status'."
        });
        response = await api.status(params);
        break;
      case "wait_complete":
        if (!params.key || !params.task_id) return res.status(400).json({
          error: "Paramenter 'key' dan 'task_id' wajib diisi untuk action 'wait_complete'."
        });
        response = await api.waitComplete(params);
        break;
      case "list_keys":
        response = await api.listKeys();
        break;
      case "del_key":
        if (!params.key) return res.status(400).json({
          error: "Paramenter 'key' wajib diisi untuk action 'del_key'."
        });
        response = await api.delKey(params.key);
        break;
      case "profile":
        if (!params.key) return res.status(400).json({
          error: "Paramenter 'key' wajib diisi untuk action 'profile'."
        });
        response = await api.getProfile(params.key);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung adalah 'register', 'generate', 'status', 'wait_complete', 'list_keys', 'del_key', 'profile'.`
        });
    }
    if (response === null) {
      return res.status(500).json({
        error: `Proses untuk action '${action}' gagal. Periksa log server untuk detail.`
      });
    }
    console.log(`Handler - Merespons untuk action '${action}':`, JSON.stringify(response, null, 2));
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan tidak terduga di handler untuk action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}