import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function logCookies(jar, url, label) {
  try {
    const cookies = await jar.getCookies(url);
    console.log(`\n[COOKIES ${label}] URL: ${url}`);
    if (cookies.length === 0) {
      console.log("  - (Tidak ada cookie)");
      return;
    }
    cookies.forEach(c => {
      const valuePreview = c.value ? c.value.substring(0, 80) : "(null)";
      const ellipsis = c.value && c.value.length > 80 ? "..." : "";
      console.log(`  - ${c.key} = ${valuePreview}${ellipsis}`);
    });
  } catch (e) {
    console.error(`Gagal membaca cookie untuk ${url}: ${e.message}`);
  }
}
async function followRedirects(client, url, headers, maxRedirects = 10) {
  let currentUrl = url;
  let redirectCount = 0;
  while (redirectCount < maxRedirects) {
    console.log(`\n[REQUEST ${redirectCount + 1}] ${currentUrl}`);
    let response;
    try {
      response = await client.get(currentUrl, {
        headers: headers,
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
    } catch (error) {
      if (error.response) {
        response = error.response;
      } else {
        throw error;
      }
    }
    console.log(`[RESPONSE ${redirectCount + 1}] Status: ${response.status}`);
    await logCookies(client.defaults.jar, currentUrl, `after req ${redirectCount + 1}`);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) {
        throw new Error(`Status ${response.status} redirect tanpa header location.`);
      }
      const nextUrl = new URL(location, currentUrl);
      console.log(`[REDIRECT ${redirectCount + 1}] -> ${nextUrl.href}`);
      currentUrl = nextUrl.href;
      redirectCount++;
    } else {
      return {
        finalUrl: currentUrl
      };
    }
  }
  throw new Error(`Terlalu banyak redirect (melebihi ${maxRedirects})`);
}
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
    });
  }
  async createEmail() {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      return response.data?.email;
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
      return response.data?.data?.[0]?.text_content || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessages' untuk email ${email}: ${error.message}`);
      return null;
    }
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
      return false;
    }
  }
}
class Veo3o1API {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://veo3o1.com",
        sendMagic: "/api/auth/send-magic-link",
        session: "/api/auth/session",
        userCredits: "/api/get-user-credits",
        userInfo: "/api/get-user-info",
        uploadImage: "/api/upload-video-image",
        generateVideo: "/api/generate-video",
        videoStatus: task_id => `/api/video-status/${task_id}`,
        downloadR2: "/api/videos/download-to-r2"
      },
      locale: "en",
      page: "/veo3.1-video-generator"
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://veo3o1.com",
      referer: "https://veo3o1.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: this.config.endpoints.base,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "*/*",
        "content-type": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      }
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.session_token) throw new Error("Token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performAuth() {
    console.log("\n====== MEMULAI PROSES AUTENTIKASI BARU ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const browserHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "upgrade-insecure-requests": "1",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    await this.api.get(this.config.page, {
      headers: browserHeaders
    });
    console.log("Proses: Halaman dikunjungi, cookie awal diatur.");
    await logCookies(this.cookieJar, this.config.endpoints.base, "INITIAL");
    const payload = {
      email: email,
      locale: this.config.locale
    };
    await this.api.post(this.config.endpoints.sendMagic, payload);
    console.log(`Proses: Magic link dikirim ke ${email}, mencari link verifikasi...`);
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      const content = await this.wudysoft.checkMessages(email);
      if (content) {
        const match = content.match(/https:\/\/veo3o1\.com\/api\/auth\/verify-email\?token=[\w-]+\.[\w-]+\.[\w-]+&locale=en/);
        verificationLink = match ? match[0] : null;
        if (verificationLink) break;
      }
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    const redirectClient = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    await followRedirects(redirectClient, verificationLink, browserHeaders, 10);
    console.log("\n====== EKSTRAKSI TOKEN ======");
    await logCookies(this.cookieJar, this.config.endpoints.base, "FINAL");
    const cookies = await this.cookieJar.getCookies(this.config.endpoints.base);
    const sessionCookie = cookies.find(c => c.key === "__Secure-authjs.session-token");
    if (!sessionCookie?.value) throw new Error("Gagal mengekstrak session-token setelah redirect.");
    console.log("\n[SUCCESS] Sesi berhasil diekstrak!");
    console.log(`[TOKEN] ${sessionCookie.value.substring(0, 50)}...`);
    console.log("\n====== AUTENTIKASI SELESAI ======\n");
    return {
      session_token: sessionCookie.value,
      email: email
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru...");
      const sessionData = await this._performAuth();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `veo3o1-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async _ensureValidSession({
    key
  }) {
    let sessionData;
    let currentKey = key;
    if (key) {
      try {
        sessionData = await this._getTokenFromKey(key);
      } catch (error) {
        console.warn(`[PERINGATAN] ${error.message}. Mendaftarkan sesi baru...`);
      }
    }
    if (!sessionData) {
      console.log("Proses: Kunci tidak valid atau tidak disediakan, mendaftarkan sesi baru...");
      const newSession = await this.register();
      if (!newSession?.key) throw new Error("Gagal mendaftarkan sesi baru.");
      console.log(`-> PENTING: Simpan kunci baru ini: ${newSession.key}`);
      currentKey = newSession.key;
      sessionData = await this._getTokenFromKey(currentKey);
    }
    await this.cookieJar.setCookie(`__Secure-authjs.session-token=${sessionData.session_token}; Domain=veo3o1.com; Path=/; Secure; SameSite=Lax`, this.config.endpoints.base);
    const sessionRes = await this.api.get(this.config.endpoints.session);
    if (sessionRes.data.user) {
      console.log("Proses: Sesi valid.");
      return {
        sessionData: sessionData,
        key: currentKey
      };
    }
    console.log("Proses: Sesi tidak valid, mendaftarkan sesi baru...");
    const newSession = await this.register();
    currentKey = newSession.key;
    sessionData = await this._getTokenFromKey(currentKey);
    await this.cookieJar.setCookie(`__Secure-authjs.session-token=${sessionData.session_token}; Domain=veo3o1.com; Path=/; Secure; SameSite=Lax`, this.config.endpoints.base);
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("veo3o1-session-")).map(paste => paste.key);
    } catch (error) {
      console.error("Gagal mengambil daftar kunci:", error.message);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) {
      console.error("Kunci tidak disediakan untuk dihapus.");
      return false;
    }
    try {
      console.log(`Proses: Mencoba menghapus kunci: ${key}`);
      const success = await this.wudysoft.delPaste(key);
      console.log(success ? `Kunci ${key} berhasil dihapus.` : `Gagal menghapus kunci ${key}.`);
      return success;
    } catch (error) {
      console.error(`Terjadi error saat menghapus kunci ${key}:`, error.message);
      throw error;
    }
  }
  async _uploadImage(image) {
    try {
      console.log("Proses: Mengunggah gambar...");
      let imageBuffer;
      if (Buffer.isBuffer(image)) {
        imageBuffer = image;
      } else if (typeof image === "string" && image.startsWith("http")) {
        const res = await axios.get(image, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(res.data);
      } else if (typeof image === "string" && image.startsWith("data:image/")) {
        imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
      } else {
        throw new Error("imageUrl harus berupa URL, base64, atau Buffer.");
      }
      const form = new FormData();
      const filename = `image-${Date.now()}.jpg`;
      form.append("file", imageBuffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      const response = await this.api.post(this.config.endpoints.uploadImage, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Gambar berhasil diunggah.");
      return response.data.data;
    } catch (error) {
      console.error(`Proses unggah gambar gagal: ${error.message}`);
      throw error;
    }
  }
  async txt2vid({
    key,
    prompt = PROMPT.text,
    aspectRatio = "auto",
    ...rest
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Membuat video dari teks...");
      const payload = {
        generationType: "text_to_video",
        prompt: prompt,
        aspectRatio: aspectRatio,
        ...rest
      };
      const response = await this.api.post(this.config.endpoints.generateVideo, payload);
      console.log("Proses: Tugas txt2vid berhasil dibuat.");
      return {
        ...response.data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`Proses txt2vid gagal: ${error.message}`);
      throw error;
    }
  }
  async img2vid({
    key,
    prompt = PROMPT.text,
    imageUrl,
    aspectRatio = "auto",
    ...rest
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Membuat video dari gambar...");
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      if (imageUrls.length === 0) throw new Error("Paling tidak satu imageUrl diperlukan.");
      const uploaded = [];
      for (const img of imageUrls) {
        uploaded.push(await this._uploadImage(img));
      }
      const imageUrlsArr = uploaded.map(u => u.imageUrl);
      const imageKeysArr = uploaded.map(u => u.imageKey);
      const payload = {
        generationType: "image_to_video",
        prompt: prompt,
        aspectRatio: aspectRatio,
        imageUrls: imageUrlsArr,
        imageKeys: imageKeysArr,
        ...rest
      };
      const response = await this.api.post(this.config.endpoints.generateVideo, payload);
      console.log("Proses: Tugas img2vid berhasil dibuat.");
      return {
        ...response.data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`Proses img2vid gagal: ${error.message}`);
      throw error;
    }
  }
  async status({
    key,
    task_id
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk task_id ${task_id}...`);
      const statusRes = await this.api.get(this.config.endpoints.videoStatus(task_id));
      if (statusRes.data.data.status === "completed" && statusRes.data.data.successFlag === 1) {
        console.log("Proses: Video temp, otomatis mendownload ke R2...");
        const downloadRes = await this.api.post(this.config.endpoints.downloadR2, {
          taskId: task_id
        });
        return {
          ...statusRes.data.data,
          ...downloadRes.data.data,
          key: currentKey
        };
      }
      console.log("Proses: Status berhasil didapatkan.");
      return {
        ...statusRes.data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`Proses status gagal: ${error.message}`);
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
  const api = new Veo3o1API();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'txt2vid', 'img2vid', 'list_key', 'del_key', 'status'.`
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