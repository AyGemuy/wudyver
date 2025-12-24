import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const names = ["Alex", "Budi", "Caca", "Dian", "Eka", "Fajar", "Gita", "Hadi", "Indra", "Joko", "Kiki", "Lina", "Maman", "Nia", "Oka", "Putri", "Qila", "Rian", "Siti", "Tono"];
const surnames = ["Wijaya", "Sutrisno", "Pratama", "Saputra", "Rahayu", "Kusuma", "Wulandari", "Santoso", "Hidayat", "Nugroho"];
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`,
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        ...SpoofHead()
      }
    });
  }
  async createMail() {
    try {
      console.log("[WUDY] Membuat email...");
      const {
        data
      } = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      const email = data?.email || null;
      console.log(`[WUDY] Email: ${email}`);
      return email;
    } catch (err) {
      console.error(`[WUDY] Create mail gagal: ${err.message}`);
      throw err;
    }
  }
  async checkMail(email) {
    try {
      const {
        data
      } = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = data?.data?.[0]?.text_content || "";
      const codeMatch = content.match(/A-(\d{6})/);
      const code = codeMatch ? `A-${codeMatch[1]}` : null;
      return {
        code: code,
        content: content
      };
    } catch (err) {
      console.error(`[WUDY] Check mail gagal: ${err.message}`);
      return {
        code: null,
        content: ""
      };
    }
  }
  async createPaste(title, content) {
    try {
      const {
        data
      } = await this.client.get("/tools/paste/v1", {
        params: {
          action: "create",
          title: title,
          content: content
        }
      });
      return data?.key || null;
    } catch (err) {
      console.error(`[WUDY] Create paste gagal: ${err.message}`);
      throw err;
    }
  }
  async getPaste(key) {
    try {
      const {
        data
      } = await this.client.get("/tools/paste/v1", {
        params: {
          action: "get",
          key: key
        }
      });
      return data?.content || null;
    } catch (err) {
      console.error(`[WUDY] Get paste gagal: ${err.message}`);
      return null;
    }
  }
  async listPaste() {
    try {
      const {
        data
      } = await this.client.get("/tools/paste/v1", {
        params: {
          action: "list"
        }
      });
      return data || [];
    } catch (err) {
      console.error(`[WUDY] List paste gagal: ${err.message}`);
      return [];
    }
  }
  async delPaste(key) {
    try {
      const {
        data
      } = await this.client.get("/tools/paste/v1", {
        params: {
          action: "delete",
          key: key
        }
      });
      return !!data;
    } catch (err) {
      console.error(`[WUDY] Del paste gagal: ${err.message}`);
      return false;
    }
  }
}
class AlleAI {
  constructor() {
    this.token = null;
    this.conversation = null;
    this.email = null;
    this.password = null;
    this.wudy = new WudysoftAPI();
    this.client = axios.create({
      baseURL: "https://api.alle-ai.com/api/v1",
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        origin: "https://app.alle-ai.com",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": `"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"`,
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": `"Android"`,
        ...SpoofHead()
      }
    });
  }
  rand() {
    return Math.random().toString(36).substring(2, 12);
  }
  randName() {
    const first = names[Math.floor(Math.random() * names.length)];
    const last = surnames[Math.floor(Math.random() * surnames.length)];
    return {
      first_name: first,
      last_name: last
    };
  }
  async performRegistration() {
    try {
      console.log("\n====== MEMULAI REGISTRASI ALLE-AI ======");
      const email = await this.wudy.createMail();
      const password = `${this.rand()}A1@`;
      const {
        first_name,
        last_name
      } = this.randName();
      this.email = email;
      this.password = password;
      console.log(`[REGISTER] Nama: ${first_name} ${last_name}`);
      console.log(`[REGISTER] Email: ${email}`);
      const {
        data
      } = await this.client.post("/register", {
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password,
        password_confirmation: password
      });
      if (!data.status || !data.data?.token) throw new Error("Registrasi gagal");
      this.token = data.data.token;
      console.log(`[REGISTER] Token: ${this.token.substring(0, 30)}...`);
      console.log(`[VERIFY] Menunggu kode A-XXXXXX...`);
      let code = null;
      for (let i = 0; i < 40; i++) {
        const {
          code: found
        } = await this.wudy.checkMail(email);
        if (found) {
          code = found;
          break;
        }
        console.log(`[VERIFY] Retry ${i + 1}/40...`);
        await sleep(3e3);
      }
      if (!code) throw new Error("Kode verifikasi tidak ditemukan");
      const verifyRes = await this.client.post("/email/verify", {
        code: code
      }, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      if (!verifyRes.data.status) throw new Error("Verifikasi gagal");
      console.log(`[VERIFY] Email terverifikasi`);
      await this.client.post("/auth", {}, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      await this.client.post("/checkout", {
        plan: "free",
        billing_cycle: "monthly"
      }, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      console.log(`[SUBSCRIBE] Free plan aktif`);
      const first = await this.client.post("/create/first-prompt", {
        models: ["gpt-4o", "gpt-4o-mini"],
        type: "chat",
        prompt: "halo",
        combine: false,
        compare: false,
        web_search: false,
        project_id: null
      }, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      this.conversation = first.data.data.conversation.session;
      console.log(`[CHAT] Conversation baru: ${this.conversation}`);
      const key = await this.saveSession();
      console.log("====== REGISTRASI SELESAI ======\n");
      return {
        key: key,
        email: email,
        password: password,
        conversation: this.conversation,
        name: `${first_name} ${last_name}`
      };
    } catch (err) {
      console.error(`[REGISTER] Gagal: ${err.message}`);
      throw err;
    }
  }
  async register() {
    try {
      return await this.performRegistration();
    } catch (err) {
      console.error(`[REGISTER] Gagal: ${err.message}`);
      throw err;
    }
  }
  async saveSession() {
    try {
      const session = JSON.stringify({
        token: this.token,
        conversation: this.conversation,
        email: this.email,
        password: this.password
      });
      const title = `alleai-conversation-${this.rand()}`;
      const key = await this.wudy.createPaste(title, session);
      console.log(`[SAVE] Key Wudysoft: ${key}`);
      return key;
    } catch (err) {
      console.error(`[SAVE] Gagal simpan session: ${err.message}`);
      throw err;
    }
  }
  async loadSession(key) {
    try {
      console.log(`[LOAD] Memuat key: ${key}`);
      const saved = await this.wudy.getPaste(key);
      if (!saved) throw new Error("Key tidak ditemukan");
      const {
        token,
        conversation,
        email,
        password
      } = JSON.parse(saved);
      this.token = token;
      this.conversation = conversation;
      this.email = email;
      this.password = password;
      console.log(`[LOAD] Conversation: ${conversation}`);
      return {
        token: token,
        conversation: conversation
      };
    } catch (err) {
      console.error(`[LOAD] Gagal: ${err.message}`);
      throw err;
    }
  }
  async ensureConversation(key) {
    try {
      if (key) {
        await this.loadSession(key);
        if (this.conversation) return key;
      }
    } catch (err) {
      console.warn(`[WARN] Load gagal: ${err.message}`);
    }
    console.log("[ENSURE] Membuat akun baru...");
    const result = await this.register();
    return result.key;
  }
  async getModels({
    key
  }) {
    try {
      const sessionKey = await this.ensureConversation(key);
      console.log(`[MODELS] Mengambil daftar model...`);
      const {
        data
      } = await this.client.get("/models/chat", {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      if (!data) {
        throw new Error("Gagal ambil model atau format tidak valid");
      }
      console.log(`[MODELS] Ditemukan ${data.data.models.length} model`);
      return {
        models: data,
        key: sessionKey
      };
    } catch (err) {
      console.error(`[MODELS] Gagal: ${err.message}`);
      throw err;
    }
  }
  async uploadImage(imageUrl, prompt = "") {
    try {
      let buffer, filename, contentType;
      if (Buffer.isBuffer(imageUrl)) {
        buffer = imageUrl;
        filename = `img-${Date.now()}.jpg`;
        contentType = "image/jpeg";
      } else if (imageUrl.startsWith("http")) {
        const res = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        buffer = res.data;
        filename = imageUrl.split("/").pop().split("?")[0] || `img-${Date.now()}.jpg`;
        contentType = res.headers["content-type"] || "image/jpeg";
      } else if (imageUrl.startsWith("data:")) {
        const match = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!match) throw new Error("Base64 invalid");
        contentType = match[1];
        buffer = Buffer.from(match[2], "base64");
        filename = `img-${Date.now()}.${contentType.split("/")[1] || "jpg"}`;
      } else {
        throw new Error("imageUrl harus URL, base64, atau Buffer");
      }
      const form = new FormData();
      form.append("conversation", this.conversation);
      form.append("prompt", prompt);
      form.append("position[0]", "0");
      form.append("position[1]", "1");
      form.append("combine", "false");
      form.append("compare", "false");
      form.append("web_search", "false");
      form.append("input_content[uploaded_files][0][file_name]", filename);
      form.append("input_content[uploaded_files][0][file_size]", `${(buffer.length / 1024).toFixed(1)}KB`);
      form.append("input_content[uploaded_files][0][file_type]", "image");
      form.append("input_content[uploaded_files][0][file_content]", buffer, {
        filename: filename,
        contentType: contentType
      });
      const {
        data
      } = await this.client.post("/create/prompt", form, {
        headers: {
          ...form.getHeaders(),
          authorization: `Bearer ${this.token}`
        }
      });
      if (!data.id) throw new Error("Upload gagal");
      return {
        promptId: data.id,
        fileUrl: data.input_content.uploaded_files[0].file_url
      };
    } catch (err) {
      console.error(`[UPLOAD] Gagal: ${err.message}`);
      throw err;
    }
  }
  async getResponse({
    model,
    promptId,
    is_new,
    prev = []
  }) {
    try {
      const payload = {
        conversation: this.conversation,
        model: model,
        is_new: is_new,
        prompt: promptId
      };
      if (prev.length) payload.prev = prev;
      const {
        data
      } = await this.client.post("/ai-response", payload, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      if (!data.status) throw new Error(data.message || "AI gagal");
      return {
        response: data.data.response,
        messageId: data.data.id,
        model: data.data.model_uid
      };
    } catch (err) {
      console.error(`[RESPONSE] Gagal: ${err.message}`);
      throw err;
    }
  }
  async chat({
    key,
    conversation,
    prompt,
    imageUrl,
    model = "gpt-4o",
    prev = [],
    ...rest
  }) {
    try {
      const sessionKey = await this.ensureConversation(key);
      const conv = conversation || this.conversation;
      console.log(`[CHAT] Mengirim: ${prompt || "gambar"} | Conv: ${conv?.substring(0, 8)}...`);
      let result;
      if (imageUrl) {
        const {
          promptId
        } = await this.uploadImage(imageUrl, prompt || "");
        result = await this.getResponse({
          model: model || "gpt-4o-mini",
          promptId: promptId,
          is_new: false,
          prev: prev
        });
      } else {
        const first = await this.client.post("/create/first-prompt", {
          models: ["gpt-4o", "gpt-4o-mini"],
          type: "chat",
          prompt: prompt || "halo",
          combine: false,
          compare: false,
          web_search: false,
          project_id: null
        }, {
          headers: {
            authorization: `Bearer ${this.token}`
          }
        });
        const promptId = first.data.data.promptData.id;
        this.conversation = first.data.data.conversation.session;
        result = await this.getResponse({
          model: model,
          promptId: promptId,
          is_new: true
        });
      }
      return {
        msg: result.response,
        conversation: this.conversation,
        key: sessionKey,
        model: result.model,
        messageId: result.messageId
      };
    } catch (err) {
      console.error(`[CHAT] Gagal: ${err.message}`);
      throw err;
    }
  }
  async list_key() {
    try {
      const all = await this.wudy.listPaste();
      return all.filter(p => p?.title?.startsWith("alleai-conversation-")).map(p => ({
        key: p.key,
        title: p.title
      }));
    } catch (err) {
      console.error(`[LIST] Gagal: ${err.message}`);
      throw err;
    }
  }
  async del_key({
    key
  }) {
    try {
      if (!key) throw new Error("Key wajib");
      const success = await this.wudy.delPaste(key);
      console.log(success ? `[DEL] Key ${key} dihapus` : `[DEL] Gagal`);
      return success;
    } catch (err) {
      console.error(`[DEL] Gagal: ${err.message}`);
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new AlleAI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "chat":
        if (!params.prompt && !params.imageUrl) {
          return res.status(400).json({
            error: "prompt atau imageUrl wajib"
          });
        }
        response = await api.chat(params);
        break;
      case "models":
        response = await api.getModels(params);
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) return res.status(400).json({
          error: "key wajib"
        });
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: register, chat, models, list_key, del_key`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}