import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
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
      const linkMatch = content.match(/https:\/\/openaibotchat-ab4f1\.firebaseapp\.com\/__\/auth\/action\?[^\s\r\n]+/);
      const link = linkMatch?.[0] || null;
      const codeMatch = content.match(/oobCode=([a-zA-Z0-9_-]+)(?:&|$|\r|\n|\s)/);
      const oobCode = codeMatch?.[1] || null;
      return {
        link: link,
        oobCode: oobCode
      };
    } catch (err) {
      console.error(`[WUDY] Check mail gagal: ${err.message}`);
      return {
        link: null,
        oobCode: null
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
      return data || null;
    } catch (err) {
      console.error(`[WUDY] Del paste gagal: ${err.message}`);
      return false;
    }
  }
}
class FirebaseIdentityAPI {
  constructor(apiKey = "AIzaSyDg7i-RpmnpDdWQejnruOSTE7IgI7yF_do") {
    this.key = apiKey;
    this.base = "https://identitytoolkit.googleapis.com/v1/accounts";
    this.chatBase = "https://us-central1-openaibotchat-ab4f1.cloudfunctions.net";
    this.firestoreBase = "https://firestore.googleapis.com/v1/projects/openaibotchat-ab4f1/databases/(default)/documents";
    this.uid = null;
    this.token = null;
    this.email = null;
    this.password = null;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://aico-chat.com",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        ...SpoofHead()
      }
    }));
    this.wudy = new WudysoftAPI();
  }
  rand() {
    return Math.random().toString(36).substring(2, 12);
  }
  async followLink(url) {
    try {
      console.log(`[FOLLOW] Mengikuti link verifikasi...`);
      const redirectClient = wrapper(axios.create({
        jar: this.jar,
        withCredentials: true,
        maxRedirects: 10
      }));
      await redirectClient.get(url, {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      console.log(`[FOLLOW] Link berhasil diikuti`);
    } catch (err) {
      console.log(`[FOLLOW] Selesai dengan redirect`);
    }
  }
  async confirmVerify(oobCode) {
    try {
      console.log(`[CONFIRM] Mengkonfirmasi verifikasi dengan oobCode`);
      const decodedCode = decodeURIComponent(oobCode);
      console.log(`[CONFIRM] oobCode: ${decodedCode.substring(0, 30)}...`);
      const {
        data
      } = await this.client.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccountInfo?key=${this.key}`, {
        oobCode: decodedCode
      }, {
        headers: {
          origin: "https://openaibotchat-ab4f1.firebaseapp.com",
          referer: "https://openaibotchat-ab4f1.firebaseapp.com/",
          "x-client-version": "Chrome/JsCore/3.7.5/FirebaseCore-web"
        }
      });
      console.log(`[CONFIRM] Verifikasi berhasil dikonfirmasi`);
      return data;
    } catch (err) {
      const errMsg = err?.response?.data?.error?.message || err.message;
      console.error(`[CONFIRM] Gagal: ${errMsg}`);
      if (errMsg.includes("INVALID_OOB_CODE")) {
        console.warn(`[CONFIRM] oobCode invalid, akan skip ke follow link...`);
        return null;
      }
      throw err;
    }
  }
  async lookup(token = this.token) {
    try {
      console.log(`[LOOKUP] Mengambil info akun`);
      const {
        data
      } = await this.client.post(`${this.base}:lookup?key=${this.key}`, {
        idToken: token || this.token
      });
      const user = data?.users?.[0] || {};
      this.uid = user?.localId || this.uid;
      const verified = user?.emailVerified ? "✓" : "✗";
      console.log(`[LOOKUP] Email: ${user?.email || "N/A"} | Verified: ${verified}`);
      return user;
    } catch (err) {
      console.error(`[LOOKUP] Gagal: ${err?.response?.data?.error?.message || err.message}`);
      throw err;
    }
  }
  async verify(token = this.token) {
    try {
      console.log(`[VERIFY] Mengirim email verifikasi`);
      const {
        data
      } = await this.client.post(`${this.base}:sendOobCode?key=${this.key}`, {
        requestType: "VERIFY_EMAIL",
        idToken: token || this.token
      });
      console.log(`[VERIFY] Email terkirim`);
      return data;
    } catch (err) {
      console.error(`[VERIFY] Gagal: ${err?.response?.data?.error?.message || err.message}`);
      throw err;
    }
  }
  async saveFirestore(collection, docId, data) {
    try {
      console.log(`[FIRESTORE] Menyimpan ke ${collection}/${docId}`);
      const firestoreData = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") {
          firestoreData[key] = {
            stringValue: value
          };
        } else if (typeof value === "number") {
          firestoreData[key] = {
            integerValue: value
          };
        } else if (typeof value === "boolean") {
          firestoreData[key] = {
            booleanValue: value
          };
        } else if (value === null) {
          firestoreData[key] = {
            nullValue: null
          };
        } else {
          firestoreData[key] = {
            stringValue: JSON.stringify(value)
          };
        }
      }
      const url = `${this.firestoreBase}/${collection}/${docId}?key=${this.key}`;
      const {
        data: result
      } = await this.client.patch(url, {
        fields: firestoreData
      }, {
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json"
        }
      });
      console.log(`[FIRESTORE] Data berhasil disimpan`);
      return result;
    } catch (err) {
      console.error(`[FIRESTORE] Gagal: ${err?.response?.data?.error?.message || err.message}`);
      throw err;
    }
  }
  async getFirestore(collection, docId) {
    try {
      console.log(`[FIRESTORE] Mengambil ${collection}/${docId}`);
      const url = `${this.firestoreBase}/${collection}/${docId}?key=${this.key}`;
      const {
        data
      } = await this.client.get(url, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      const result = {};
      if (data?.fields) {
        for (const [key, value] of Object.entries(data.fields)) {
          if (value.stringValue !== undefined) {
            result[key] = value.stringValue;
          } else if (value.integerValue !== undefined) {
            result[key] = parseInt(value.integerValue);
          } else if (value.booleanValue !== undefined) {
            result[key] = value.booleanValue;
          } else if (value.nullValue !== undefined) {
            result[key] = null;
          }
        }
      }
      console.log(`[FIRESTORE] Data berhasil diambil`);
      return result;
    } catch (err) {
      console.error(`[FIRESTORE] Gagal: ${err?.response?.data?.error?.message || err.message}`);
      return null;
    }
  }
  async delFirestore(collection, docId) {
    try {
      console.log(`[FIRESTORE] Menghapus ${collection}/${docId}`);
      const url = `${this.firestoreBase}/${collection}/${docId}?key=${this.key}`;
      await this.client.delete(url, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      console.log(`[FIRESTORE] Data berhasil dihapus`);
      return true;
    } catch (err) {
      console.error(`[FIRESTORE] Gagal: ${err?.response?.data?.error?.message || err.message}`);
      return false;
    }
  }
  async getUserData(uid = this.uid) {
    try {
      console.log(`[USER] Mengambil data user: ${uid?.substring(0, 10)}...`);
      const userData = await this.getFirestore("users", uid);
      if (userData) {
        console.log(`[USER] Email: ${userData?.email || "N/A"}`);
        console.log(`[USER] Verified: ${userData?.verified ? "✓" : "✗"}`);
        console.log(`[USER] Last Login: ${userData?.lastLogin || "N/A"}`);
      } else {
        console.log(`[USER] Data tidak ditemukan`);
      }
      return userData;
    } catch (err) {
      console.error(`[USER] Gagal: ${err.message}`);
      return null;
    }
  }
  async updateUserData(uid = this.uid, updates = {}) {
    try {
      console.log(`[USER] Update data user: ${uid?.substring(0, 10)}...`);
      const existing = await this.getUserData(uid);
      const merged = {
        ...existing,
        ...updates,
        lastUpdated: Date.now()
      };
      await this.saveFirestore("users", uid, merged);
      console.log(`[USER] Data berhasil diupdate`);
      return merged;
    } catch (err) {
      console.error(`[USER] Gagal update: ${err.message}`);
      throw err;
    }
  }
  async loadSession(key) {
    try {
      console.log(`[LOAD] Memuat sesi: ${key}`);
      const saved = await this.wudy.getPaste(key);
      if (!saved) throw new Error(`Sesi ${key} tidak ditemukan`);
      const session = JSON.parse(saved);
      this.uid = session?.uid || null;
      this.token = session?.token || null;
      this.email = session?.email || null;
      this.password = session?.password || null;
      console.log(`[LOAD] Sesi dimuat - UID: ${this.uid?.substring(0, 10)}...`);
      console.log(`[LOAD] Token: ${this.token?.substring(0, 30)}...`);
      return session;
    } catch (err) {
      console.error(`[LOAD] Gagal: ${err.message}`);
      throw err;
    }
  }
  async saveSession(saveToFirestore = true) {
    try {
      const session = JSON.stringify({
        uid: this.uid,
        token: this.token,
        email: this.email || null,
        password: this.password || null
      });
      const title = `firebase-session-${this.rand()}`;
      const key = await this.wudy.createPaste(title, session);
      console.log(`[SAVE] Sesi disimpan ke Wudysoft - Key: ${key}`);
      console.log(`[SAVE] UID: ${this.uid}`);
      console.log(`[SAVE] Token: ${this.token?.substring(0, 30)}...`);
      if (saveToFirestore && this.uid && this.token) {
        try {
          const userData = {
            email: this.email || "",
            pasteKey: key,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            verified: true,
            uid: this.uid
          };
          await this.saveFirestore("users", this.uid, userData);
          console.log(`[SAVE] User data disimpan ke Firestore`);
          const saved = await this.getUserData(this.uid);
          if (saved) {
            console.log(`[SAVE] ✓ Verifikasi: Data berhasil tersimpan`);
          }
        } catch (err) {
          console.warn(`[SAVE] Gagal simpan ke Firestore: ${err.message}`);
        }
      }
      return key;
    } catch (err) {
      console.error(`[SAVE] Gagal: ${err.message}`);
      throw err;
    }
  }
  async performRegistration() {
    try {
      console.log("\n====== MEMULAI PROSES REGISTRASI ======");
      const mail = await this.wudy.createMail();
      const pass = `${this.rand()}A1!`;
      console.log(`[REGISTER] Email: ${mail}`);
      const {
        data
      } = await this.client.post(`${this.base}:signUp?key=${this.key}`, {
        returnSecureToken: true,
        email: mail,
        password: pass
      });
      this.uid = data?.localId || null;
      this.token = data?.idToken || null;
      this.email = mail;
      this.password = pass;
      console.log(`[REGISTER] Sign up berhasil - UID: ${this.uid?.substring(0, 10)}...`);
      console.log(`[REGISTER] Token: ${this.token?.substring(0, 30)}...`);
      await this.verify();
      console.log(`[REGISTER] Menunggu link verifikasi...`);
      let link = null;
      let oobCode = null;
      for (let i = 0; i < 60; i++) {
        const result = await this.wudy.checkMail(mail);
        if (result?.oobCode) {
          link = result.link;
          oobCode = result.oobCode;
          break;
        }
        console.log(`[REGISTER] Retry ${i + 1}/60...`);
        await sleep(3e3);
      }
      if (!oobCode) throw new Error("Link verifikasi tidak ditemukan");
      console.log(`[REGISTER] Link ditemukan`);
      console.log(`[REGISTER] oobCode: ${oobCode.substring(0, 30)}...`);
      if (link) {
        console.log(`[REGISTER] Follow link verifikasi...`);
        await this.followLink(link);
      }
      const confirmed = await this.confirmVerify(oobCode);
      if (!confirmed) {
        console.log(`[REGISTER] Skipping oobCode confirmation, menggunakan link follow...`);
      }
      console.log(`[REGISTER] Menunggu akun terverifikasi...`);
      let verified = false;
      for (let i = 0; i < 20; i++) {
        await sleep(2e3);
        try {
          const userInfo = await this.lookup();
          if (userInfo?.emailVerified) {
            verified = true;
            console.log(`[REGISTER] ✓ Akun terverifikasi`);
            console.log(userInfo);
            break;
          }
          console.log(`[REGISTER] Menunggu verifikasi... ${i + 1}/20`);
        } catch (err) {
          console.log(`[REGISTER] Lookup retry ${i + 1}/20...`);
        }
      }
      if (!verified) {
        console.warn(`[REGISTER] Akun mungkin belum terverifikasi, lanjut login...`);
      }
      console.log(`[REGISTER] Login ulang untuk refresh token...`);
      const loginResult = await this.login(mail, pass);
      this.uid = loginResult?.localId || this.uid;
      this.token = loginResult?.idToken || this.token;
      console.log(`[REGISTER] Token & UID diperbarui`);
      console.log(`[REGISTER] UID: ${this.uid}`);
      console.log(`[REGISTER] Token: ${this.token?.substring(0, 50)}...`);
      const key = await this.saveSession();
      console.log("====== REGISTER SELESAI ======\n");
      return {
        key: key,
        email: mail,
        password: pass,
        uid: this.uid
      };
    } catch (err) {
      console.error(`[REGISTER] Gagal: ${err?.response?.data?.error?.message || err.message}`);
      throw err;
    }
  }
  async register(email, password) {
    try {
      console.log("-> Mendaftarkan sesi baru...");
      const sessionData = await this.performRegistration();
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci: ${sessionData.key}`);
      return sessionData;
    } catch (err) {
      console.error(`Proses registrasi gagal: ${err.message}`);
      throw err;
    }
  }
  async login(email, password) {
    try {
      console.log(`[LOGIN] Proses login: ${email}`);
      const {
        data
      } = await this.client.post(`${this.base}:signInWithPassword?key=${this.key}`, {
        returnSecureToken: true,
        email: email,
        password: password
      });
      this.uid = data?.localId || null;
      this.token = data?.idToken || null;
      this.email = email;
      this.password = password;
      console.log(`[LOGIN] Berhasil - UID: ${this.uid?.substring(0, 10)}...`);
      console.log(`[LOGIN] Token: ${this.token?.substring(0, 30)}...`);
      try {
        await this.updateUserData(this.uid, {
          lastLogin: Date.now()
        });
      } catch (err) {
        console.warn(`[LOGIN] Skip update Firestore: ${err.message}`);
      }
      return {
        uid: this.uid,
        token: this.token,
        ...data
      };
    } catch (err) {
      console.error(`[LOGIN] Gagal: ${err?.response?.data?.error?.message || err.message}`);
      throw err;
    }
  }
  async ensureSession(key) {
    let current = key;
    if (key) {
      try {
        await this.loadSession(key);
        return current;
      } catch (err) {
        console.warn(`[WARN] ${err.message}, membuat sesi baru...`);
      }
    }
    const newSession = await this.register();
    console.log(`[INFO] Simpan key baru: ${newSession.key}`);
    return newSession.key;
  }
  async chat({
    prompt,
    messages,
    key,
    ...rest
  }) {
    try {
      const sessionKey = await this.ensureSession(key);
      const uid = rest?.uid || this.uid;
      console.log(`[CHAT] Mengirim pesan - UID: ${uid?.substring(0, 10)}...`);
      const msgs = messages?.length ? messages : [{
        role: "system",
        content: "You are Aico, a helpful AI assistant."
      }, {
        role: "user",
        content: prompt || "Hello"
      }];
      const {
        data
      } = await this.client.post(`${this.chatBase}/callAPI`, msgs, {
        headers: {
          uid: uid
        }
      });
      const reply = data?.msg || data?.message || "No response";
      console.log(`[CHAT] Balasan: ${reply?.substring(0, 50)}...`);
      return {
        error: data?.error || "",
        msg: reply,
        key: sessionKey,
        ...data
      };
    } catch (err) {
      console.error(`[CHAT] Gagal: ${err?.response?.data?.error || err.message}`);
      throw err;
    }
  }
  async writer({
    prompt,
    messages,
    key,
    ...rest
  }) {
    try {
      const sessionKey = await this.ensureSession(key);
      const uid = rest?.uid || this.uid;
      console.log(`[WRITER] Mengirim permintaan - UID: ${uid?.substring(0, 10)}...`);
      const msgs = messages?.length ? messages : [{
        role: "system",
        content: "You are an AI writing assistant."
      }, {
        role: "user",
        content: prompt || "Write something"
      }];
      const {
        data
      } = await this.client.post(`${this.chatBase}/callAPI`, msgs, {
        headers: {
          uid: uid
        }
      });
      const result = data?.msg || data?.message || "No content";
      console.log(`[WRITER] Konten: ${result?.substring(0, 50)}...`);
      return {
        error: data?.error || "",
        msg: result,
        key: sessionKey,
        ...data
      };
    } catch (err) {
      console.error(`[WRITER] Gagal: ${err?.response?.data?.error || err.message}`);
      throw err;
    }
  }
  async list_key() {
    try {
      console.log("[LIST] Mengambil daftar key...");
      const all = await this.wudy.listPaste();
      const keys = all.filter(p => p?.title?.startsWith("firebase-session-")).map(p => p.key);
      console.log(`[LIST] Ditemukan ${keys.length} key`);
      return keys;
    } catch (err) {
      console.error(`[LIST] Gagal: ${err.message}`);
      throw err;
    }
  }
  async del_key({
    key
  }) {
    try {
      if (!key) throw new Error("Key tidak disediakan");
      console.log(`[DEL] Menghapus key: ${key}`);
      const success = await this.wudy.delPaste(key);
      console.log(success ? `[DEL] Berhasil` : `[DEL] Gagal`);
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
  const api = new FirebaseIdentityAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "login":
        if (!params.email || !params.password) {
          return res.status(400).json({
            error: "Parameter 'email' dan 'password' wajib diisi untuk action 'login'."
          });
        }
        response = await api.login(params.email, params.password);
        break;
      case "chat":
        if (!params.prompt && !params.messages) {
          return res.status(400).json({
            error: "Parameter 'prompt' atau 'messages' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "writer":
        if (!params.prompt && !params.messages) {
          return res.status(400).json({
            error: "Parameter 'prompt' atau 'messages' wajib diisi untuk action 'writer'."
          });
        }
        response = await api.writer(params);
        break;
      case "user_info":
        if (!params.key) {
          return res.status(400).json({
            error: "Parameter 'key' wajib diisi untuk action 'user_info'."
          });
        }
        await api.loadSession(params.key);
        response = await api.getUserData();
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) {
          return res.status(400).json({
            error: "Parameter 'key' wajib diisi untuk action 'del_key'."
          });
        }
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'chat', 'writer', 'user_info', 'list_key', 'del_key'.`
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