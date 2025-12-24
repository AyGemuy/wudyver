import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const apiHead = () => ({
  accept: "application/json, text/plain, */*",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  origin: "https://app.emergent.sh",
  referer: "https://app.emergent.sh/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3N4d2t5dW1oZHlreXJoaGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3NzI2NDYsImV4cCI6MjA0MDM0ODY0Nn0.3unO6zdz2NilPL2xdxt7OjvZA19copj3Q7ulIjPVDLQ",
  "x-client-info": "supabase-js-web/2.57.4",
  "x-supabase-api-version": "2024-01-01",
  ...SpoofHead()
});
const streamHead = () => ({
  accept: "text/event-stream",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  "content-type": "application/json",
  origin: "https://app.emergent.sh",
  priority: "u=1, i",
  referer: "https://app.emergent.sh/chat",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  ...SpoofHead()
});
const cookieJar = new CookieJar();
const axiosWithCookies = wrapper(axios.create({
  jar: cookieJar,
  headers: apiHead()
}));
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
    });
  }
  async createMail() {
    try {
      return (await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      })).data?.email;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createMail': ${error.message}`);
      throw error;
    }
  }
  async checkMessage(email) {
    try {
      return ((await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      })).data?.data || [])[0]?.text_content || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessage': ${error.message}`);
      return null;
    }
  }
  async createPaste(title, content) {
    try {
      return (await this.client.get("/tools/paste/v1", {
        params: {
          action: "create",
          title: title,
          content: content
        }
      })).data?.key || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createPaste': ${error.message}`);
      throw error;
    }
  }
  async getPaste(key) {
    try {
      return (await this.client.get("/tools/paste/v1", {
        params: {
          action: "get",
          key: key
        }
      })).data?.content || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.getPaste': ${error.message}`);
      return null;
    }
  }
  async listPastes() {
    try {
      return (await this.client.get("/tools/paste/v1", {
        params: {
          action: "list"
        }
      })).data || [];
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.listPastes': ${error.message}`);
      throw error;
    }
  }
  async delPaste(key) {
    try {
      return (await this.client.get("/tools/paste/v1", {
        params: {
          action: "delete",
          key: key
        }
      })).data || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.delPaste': ${error.message}`);
      throw error;
    }
  }
}
class EmergentAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.emergent.sh",
      headers: {
        ...apiHead(),
        "content-type": "application/json"
      }
    });
    this.supabase = axios.create({
      baseURL: "https://snksxwkyumhdykyrhhch.supabase.co/auth/v1",
      headers: {
        ...apiHead(),
        "content-type": "application/json"
      }
    });
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  async _getUser(token) {
    try {
      const response = await this.supabase.get("/user", {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error("[LOG ERROR] Gagal mengambil data pengguna dengan token yang diberikan.");
      throw new Error("Token tidak valid atau kedaluwarsa.");
    }
  }
  async _getTokenFromKey(key) {
    console.log(`LOG PROSES: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      const token = sessionData.token;
      if (!token) throw new Error("Token tidak valid dalam sesi yang disimpan.");
      console.log("LOG PROSES: Sesi berhasil dimuat.");
      return token;
    } catch (parseError) {
      throw new Error(`Gagal mem-parsing data sesi dari kunci "${key}".`);
    }
  }
  async _performPostActivationSteps(token, user) {
    console.log("LOG PROSES: Menjalankan langkah-langkah pasca-aktivasi...");
    const authHeader = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    try {
      await this.supabase.put("/user", {
        data: {
          ...user.user_metadata,
          full_name: `${user.user_metadata.full_name}_${this._random()}`
        }
      }, authHeader);
      await this.api.post("/user/details", {
        ads_metadata: {
          email: user.email,
          fbp: `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e9)}`
        }
      }, authHeader);
      await this.api.get("/payments/custom-payments/check?tag=pro_mode", authHeader);
      await this.api.post("/user/cohort", null, authHeader);
      await this.api.get("/credits/balance?", authHeader);
      await this.api.get("/jobs/v0/deployments?", authHeader);
      console.log("LOG PROSES: Semua langkah pasca-aktivasi berhasil diselesaikan.");
    } catch (error) {
      console.warn(`[LOG WARNING] Terjadi error pada langkah pasca-aktivasi: ${error.message}. Melanjutkan proses...`);
    }
  }
  async _performRegistration() {
    console.log("LOG PROSES: Memulai pendaftaran akun baru...");
    const email = await this.wudysoft.createMail();
    console.log(`LOG PROSES: Email dibuat: ${email}`);
    const password = `${this._random()}A1!`;
    const fullName = `user_${this._random()}`;
    await this.supabase.post("/signup", {
      email: email,
      password: password,
      data: {
        full_name: fullName
      }
    });
    console.log("LOG PROSES: Pendaftaran berhasil, menunggu email verifikasi...");
    let verificationLink = null;
    for (let i = 0; i < 30; i++) {
      const message = await this.wudysoft.checkMessage(email);
      if (message?.includes("Confirm your signup")) {
        verificationLink = message.match(/\[Confirm your mail\]\((https:\/\/[^\s)]+)\)/)?.[1];
        if (verificationLink) break;
      }
      console.log(`LOG PROSES: Menunggu verifikasi... (${i + 1}/30)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi dalam batas waktu.");
    console.log("LOG PROSES: Link verifikasi ditemukan, mengaktifkan akun...");
    await axiosWithCookies.get(verificationLink);
    console.log("LOG PROSES: Login untuk mendapatkan access token...");
    const loginResponse = await this.supabase.post("/token?grant_type=password", {
      email: email,
      password: password
    });
    const accessToken = loginResponse.data?.access_token;
    if (!accessToken) throw new Error("Gagal mendapatkan access token setelah login.");
    console.log("LOG PROSES: Access token berhasil didapatkan.");
    const user = await this.supabase.get("/user", {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
    await this._performPostActivationSteps(accessToken, user.data);
    return accessToken;
  }
  async register() {
    try {
      const token = await this._performRegistration();
      const newKey = await this.wudysoft.createPaste(`emergent-token-${this._random()}`, JSON.stringify({
        token: token
      }));
      if (!newKey) throw new Error("Gagal menyimpan sesi baru ke Wudysoft.");
      console.log(`LOG PROSES: -> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey
      };
    } catch (error) {
      console.error(`[ERROR] Registrasi sesi baru gagal: ${error.message}`);
      throw error;
    }
  }
  async ensure_key({
    key
  }) {
    if (key) {
      try {
        const token = await this._getTokenFromKey(key);
        const user = await this._getUser(token);
        return {
          token: token,
          key: key,
          user: user
        };
      } catch (error) {
        console.warn(`[LOG WARNING] ${error.message}. Mendaftarkan sesi baru...`);
      }
    }
    const newSession = await this.register();
    const newToken = await this._getTokenFromKey(newSession.key);
    const newUser = await this._getUser(newToken);
    console.log(`LOG PROSES: -> PENTING: Simpan kunci baru Anda: ${newSession.key}`);
    return {
      token: newToken,
      key: newSession.key,
      user: newUser
    };
  }
  async chat({
    key,
    prompt,
    model,
    ...rest
  }) {
    try {
      const {
        token,
        key: sessionKey,
        user
      } = await this.ensure_key({
        key: key
      });
      const clientRefId = crypto.randomUUID();
      const model_name = model || "claude-sonnet-4-20250514?thinking_mode=true";
      const defaultPayload = {
        client_ref_id: clientRefId,
        payload: {
          processor_type: "env_only",
          is_cloud: true,
          env_image: "us-central1-docker.pkg.dev/emergent-default/emergent-container-hub/fastapi_react_mongo_base_image_cloud_arm:release-16082025-1",
          branch: "",
          repository: "",
          prompt_name: "auto_prompt_selector",
          prompt_version: "latest",
          work_space_dir: "",
          task: prompt,
          model_name: model_name,
          per_instance_cost_limit: 10,
          agentic_skills: [],
          plugin_version: "release-10092025-1",
          base64_image_list: [],
          human_timestamp: Date.now(),
          asset_upload_enabled: true,
          is_pro_user: false,
          thinking_level: "thinking",
          job_mode: "public",
          mcp_id: []
        },
        model_name: model_name,
        resume: false,
        ads_metadata: {
          email: user.email,
          fbp: `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e9)}`
        }
      };
      const requestPayload = {
        ...defaultPayload,
        ...rest,
        payload: {
          ...defaultPayload.payload,
          ...rest.payload || {}
        }
      };
      await this.api.post("/jobs/v0/submit-queue/", requestPayload, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      console.log(`LOG PROSES: Tugas berhasil dikirim dengan task_id: ${clientRefId}`);
      return {
        task_id: clientRefId,
        key: sessionKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`[ERROR] Gagal mengirim chat: ${errorMessage}`);
      throw new Error(`Gagal mengirim chat: ${errorMessage}`);
    }
  }
  _parseSSEData(data) {
    const lines = data.split("\n").filter(line => line.trim() !== "");
    const events = [];
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const jsonData = line.substring(6);
          if (jsonData.trim() === "[DONE]") {
            events.push({
              type: "done",
              data: null
            });
          } else {
            const parsed = JSON.parse(jsonData);
            events.push({
              type: "data",
              data: parsed
            });
          }
        } catch (parseError) {
          console.warn(`[WARNING] Gagal parsing SSE data: ${line}`);
          events.push({
            type: "raw",
            data: line
          });
        }
      } else if (line.startsWith("event: ")) {
        events.push({
          type: "event",
          data: line.substring(7)
        });
      }
    }
    return events;
  }
  async _getStreamData(token, task_id) {
    try {
      const response = await axios.get(`https://api.emergent.sh/trajectories/v0/stream?job_id=${task_id}`, {
        headers: {
          ...streamHead(),
          authorization: `Bearer ${token}`
        },
        timeout: 1e4,
        responseType: "text"
      });
      if (response.data) {
        return this._parseSSEData(response.data);
      }
      return [];
    } catch (error) {
      console.warn(`[WARNING] Gagal mengambil stream data: ${error.message}`);
      return [];
    }
  }
  async _getPreviewData(token, task_id) {
    try {
      const response = await axios.get(`https://api.emergent.sh/jobs/v0/${task_id}/preview`, {
        headers: {
          ...apiHead(),
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        }
      });
      return response.data;
    } catch (error) {
      console.warn(`[WARNING] Gagal mengambil preview data: ${error.message}`);
      return null;
    }
  }
  async _getJobData(token, task_id) {
    try {
      const response = await axios.get(`https://api.emergent.sh/jobs/v0/${task_id}/`, {
        headers: {
          ...apiHead(),
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        }
      });
      return response.data;
    } catch (error) {
      console.warn(`[WARNING] Gagal mengambil job data: ${error.message}`);
      return null;
    }
  }
  async status({
    key,
    task_id
  }) {
    if (!key || !task_id) throw new Error("`key` dan `task_id` harus disediakan.");
    try {
      const token = await this._getTokenFromKey(key);
      const [streamEvents, previewData, jobData] = await Promise.all([this._getStreamData(token, task_id), this._getPreviewData(token, task_id), this._getJobData(token, task_id)]);
      console.log("=== STREAM EVENTS ===");
      console.log("Stream events count:", streamEvents.length);
      streamEvents.forEach((event, idx) => {
        console.log(`Event ${idx + 1}:`, event);
      });
      console.log("\n=== PREVIEW DATA ===");
      console.log("Preview data:", previewData);
      console.log("\n=== JOB DATA ===");
      console.log("Job data:", jobData);
      const status = jobData?.status || "unknown";
      console.log(`\nCurrent status: ${status}`);
      return {
        status: status,
        stream: streamEvents,
        preview: previewData,
        job: jobData
      };
    } catch (error) {
      if (error.response?.status === 404) {
        console.error(`[ERROR] Tugas dengan ID ${task_id} tidak ditemukan.`);
        return {
          status: "not_found",
          error: `Tugas dengan ID ${task_id} tidak ditemukan.`,
          stream: [],
          preview: null,
          job: null
        };
      }
      const errorMessage = error.response?.data?.detail || error.message;
      console.error(`[ERROR] Gagal memeriksa status: ${errorMessage}`);
      throw new Error(`Gagal memeriksa status: ${errorMessage}`);
    }
  }
  async list_key() {
    try {
      console.log("LOG PROSES: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("emergent-token-")).map(paste => paste.key);
    } catch (error) {
      console.error(`[ERROR] Gagal mengambil daftar kunci: ${error.message}`);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) throw new Error("Paramenter 'key' wajib diisi untuk menghapus.");
    try {
      console.log(`LOG PROSES: Mencoba menghapus kunci: ${key}`);
      const result = await this.wudysoft.delPaste(key);
      console.log(result ? `Kunci ${key} berhasil dihapus.` : `Gagal menghapus kunci ${key}.`);
      return result;
    } catch (error) {
      console.error(`[ERROR] Terjadi error saat menghapus kunci ${key}: ${error.message}`);
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new EmergentAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'del_key'."
          });
        }
        response = await api.del_key(params);
        break;
      case "status":
        if (!params.key || !params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'key' dan 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'chat', 'list_key', 'del_key' dan 'status'.`
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