import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  randomBytes,
  createHash
} from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function base64URLEncode(str) {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest();
}
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
  async checkMessagesAitoolsx(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/https:\/\/akamiftetnmdyucuqrms\.supabase\.co\/auth\/v1\/verify\?token=pkce_[a-zA-Z0-9.\-_]+&type=signup&redirect_to=https:\/\/aitoolsx\.net\/auth\/callback/);
        return match ? match[0] : null;
      }
      return null;
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
class AIToolsXAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYW1pZnRldG5tZHl1Y3Vxcm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTc1MzUsImV4cCI6MjA3MDEzMzUzNX0.ncKz9bXzTxHXpifk2UvevorC9uAfCsNsg2XhSUoTyks";
    this.config = {
      endpoints: {
        base: "https://aitoolsx.net/api",
        supabase: "https://akamiftetnmdyucuqrms.supabase.co/auth/v1",
        createTask: "/tasks",
        getTask: taskId => `/tasks/${taskId}`,
        presign: "/upload/presign"
      },
      supabaseKey: supabaseKey,
      models: {
        "nano-banana": {
          id: "2e45d1d3-21cf-4ae2-8d2b-f69a908d34c2",
          defaults: {
            output_format: "png"
          }
        },
        seedream: {
          id: "aa85a6b5-88f3-44c1-81e1-8d29bbe84cb9",
          defaults: {
            size: "1K",
            aspect_ratio: "9:16",
            output_format: "png"
          }
        },
        "flux-kontext": {
          id: "f4694ff6-a1f9-4ee1-bd8e-347fe8b702be",
          defaults: {
            size: "1K",
            aspect_ratio: "9:16",
            output_format: "png"
          }
        },
        "flux-dev": {
          id: "df5db8a5-635a-42ae-9983-52167b8639e4",
          defaults: {
            num_outputs: 1,
            aspect_ratio: "9:16",
            output_format: "png",
            guidance: 3.5,
            output_quality: 80,
            num_inference_steps: 28
          }
        }
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://aitoolsx.net",
      referer: "https://aitoolsx.net/",
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
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      }
    }));
    this.supabaseApi = wrapper(axios.create({
      baseURL: this.config.endpoints.supabase,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "*/*",
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        "content-type": "application/json;charset=UTF-8",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
        "x-supabase-api-version": "2024-01-01"
      }
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _generatePKCE() {
    const verifier = base64URLEncode(randomBytes(32));
    const challenge = base64URLEncode(sha256(verifier));
    return {
      verifier: verifier,
      challenge: challenge
    };
  }
  async _uploadImage(imageBuffer, modelId) {
    try {
      console.log("Proses: Meminta presigned URL untuk unggah...");
      const presignPayload = {
        fileName: `${this._random()}.png`,
        fileSize: imageBuffer.length,
        fileType: "image/png",
        fieldName: "image_input",
        modelId: modelId
      };
      const presignResponse = await this.api.post(this.config.endpoints.presign, presignPayload);
      const {
        uploadUrl,
        downloadUrl
      } = presignResponse.data.data;
      if (!uploadUrl || !downloadUrl) throw new Error("Gagal mendapatkan presigned URL dari API.");
      console.log("Proses: Presigned URL didapatkan, mengunggah data gambar...");
      const uploadClient = axios.create();
      await uploadClient.put(uploadUrl, imageBuffer, {
        headers: {
          "Content-Type": "image/png"
        }
      });
      console.log("Proses: Gambar berhasil diunggah.");
      return downloadUrl;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses unggah gambar gagal: ${errorMessage}`);
      throw error;
    }
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
      if (!sessionData.access_token) throw new Error("Token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const {
      verifier,
      challenge
    } = this._generatePKCE();
    const verifierCookieValue = `base64-${Buffer.from(JSON.stringify(verifier)).toString("base64")}`;
    await this.cookieJar.setCookie(`sb-akamiftetnmdyucuqrms-auth-token-code-verifier=${verifierCookieValue}; Path=/; Secure; SameSite=Lax`, "https://aitoolsx.net");
    console.log("Proses: PKCE verifier cookie telah diatur.");
    const password = `${this._random()}A1!`;
    const signupPayload = {
      email: email,
      password: password,
      data: {},
      gotrue_meta_security: {},
      code_challenge: challenge,
      code_challenge_method: "s256"
    };
    await this.supabaseApi.post("/signup?redirect_to=https%3A%2F%2Faitoolsx.net%2Fauth%2Fcallback", signupPayload);
    console.log("Proses: Pendaftaran berhasil, mencari link verifikasi...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesAitoolsx(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    const redirectClient = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    const browserHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "upgrade-insecure-requests": "1",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    console.log("\n====== MENGIKUTI REDIRECT CHAIN ======");
    await followRedirects(redirectClient, verificationLink, browserHeaders, 10);
    console.log("\n====== EKSTRAKSI TOKEN ======");
    await logCookies(this.cookieJar, "https://aitoolsx.net", "FINAL");
    const aitoolsxCookies = await this.cookieJar.getCookies("https://aitoolsx.net");
    const authCookie = aitoolsxCookies.find(cookie => cookie.key.startsWith("sb-") && cookie.key.endsWith("-auth-token"));
    if (!authCookie?.value) {
      throw new Error("Gagal mengekstrak cookie auth-token setelah semua redirect.");
    }
    try {
      const decodedValue = Buffer.from(authCookie.value.replace("base64-", ""), "base64").toString();
      const sessionData = JSON.parse(decodedValue);
      if (!sessionData.access_token) {
        throw new Error("access_token tidak ditemukan di dalam cookie.");
      }
      console.log("\n[SUCCESS] Sesi berhasil diekstrak dari cookie!");
      console.log(`[TOKEN] ${sessionData.access_token.substring(0, 50)}...`);
      console.log("\n====== REGISTRASI SELESAI ======\n");
      return {
        ...sessionData,
        email: email,
        password: password
      };
    } catch (e) {
      console.error("\n[ERROR] Gagal mem-parse cookie auth:", e.message);
      throw new Error("Gagal mem-parse cookie auth-token.");
    }
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        access_token: sessionData.access_token,
        email: sessionData.email,
        password: sessionData.password
      });
      const sessionTitle = `aitoolsx-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        password: sessionData.password
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async login({
    email,
    password
  }) {
    try {
      console.log(`Proses: Mencoba login dengan email: ${email}`);
      const loginPayload = {
        email: email,
        password: password,
        gotrue_meta_security: {}
      };
      const response = await this.supabaseApi.post("/token?grant_type=password", loginPayload);
      const sessionData = response.data;
      if (!sessionData.access_token) throw new Error("Gagal mendapatkan access token dari login.");
      console.log("Proses: Login berhasil.");
      const sessionToSave = JSON.stringify({
        access_token: sessionData.access_token,
        email: email,
        password: password
      });
      const sessionTitle = `aitoolsx-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi login ke Wudysoft.");
      console.log(`-> Sesi login berhasil disimpan. Kunci Anda: ${newKey}`);
      const cookieValue = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
      await this.cookieJar.setCookie(`sb-akamiftetnmdyucuqrms-auth-token=${cookieValue}; Domain=.aitoolsx.net; Path=/; Secure; SameSite=Lax`, "https://aitoolsx.net");
      return {
        key: newKey,
        access_token: sessionData.access_token,
        email: email,
        password: password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses login gagal: ${errorMessage}`);
      throw new Error(errorMessage);
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
    const cookieValue = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
    await this.cookieJar.setCookie(`sb-akamiftetnmdyucuqrms-auth-token=${cookieValue}; Domain=.aitoolsx.net; Path=/; Secure; SameSite=Lax`, "https://aitoolsx.net");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("aitoolsx-session-")).map(paste => paste.key);
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
  async txt2img({
    key,
    prompt,
    model = "seedream",
    ...rest
  }) {
    if (!this.config.models[model]) throw new Error(`Model "${model}" tidak valid.`);
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dari teks dengan model ${model}...`);
      const modelConfig = this.config.models[model];
      const inputPayload = {
        ...modelConfig.defaults,
        ...rest,
        prompt: prompt
      };
      const payload = {
        model_id: modelConfig.id,
        input: inputPayload
      };
      const response = await this.api.post(`${this.config.endpoints.createTask}?locale=en`, payload);
      console.log("Proses: Tugas txt2img berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2img({
    key,
    prompt = PROMPT.text,
    imageUrl,
    model = "seedream",
    ...rest
  }) {
    if (!this.config.models[model]) throw new Error(`Model "${model}" tidak valid.`);
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dari gambar dengan model ${model}...`);
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      if (imageUrls.length === 0) throw new Error("Paling tidak satu imageUrl diperlukan.");
      console.log(`Proses: Akan mengunggah ${imageUrls.length} gambar...`);
      const uploadedImageUrls = [];
      const modelConfig = this.config.models[model];
      for (const url of imageUrls) {
        console.log(`Proses: Mengunduh gambar dari ${typeof url === "string" && url.startsWith("http") ? "URL" : "data input"}...`);
        let imageBuffer;
        if (Buffer.isBuffer(url)) {
          imageBuffer = url;
        } else if (url.startsWith("http")) {
          const response = await axios.get(url, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data);
        } else {
          imageBuffer = Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
        }
        const downloadUrl = await this._uploadImage(imageBuffer, modelConfig.id);
        uploadedImageUrls.push(downloadUrl);
      }
      console.log("Proses: Semua gambar telah diunggah.");
      let inputPayload = {
        ...modelConfig.defaults,
        ...rest,
        prompt: prompt
      };
      if (model === "flux-dev") {
        if (uploadedImageUrls.length > 1) console.warn(`[PERINGATAN] Model 'flux-dev' hanya mendukung satu gambar. Menggunakan yang pertama.`);
        inputPayload.image = uploadedImageUrls[0];
      } else {
        inputPayload.image_input = uploadedImageUrls;
      }
      const payload = {
        model_id: modelConfig.id,
        input: inputPayload
      };
      const response = await this.api.post(`${this.config.endpoints.createTask}?locale=en`, payload);
      console.log("Proses: Tugas img2img berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses img2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
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
      const response = await this.api.get(this.config.endpoints.getTask(task_id));
      console.log("Proses: Status berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses status gagal: ${errorMessage}`);
      throw new Error(errorMessage);
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
  const api = new AIToolsXAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "login":
        if (!params.email || !params.password) {
          return res.status(400).json({
            error: "Paramenter 'email' dan 'password' wajib diisi untuk action 'login'."
          });
        }
        response = await api.login(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'txt2img', 'img2img', 'list_key', 'del_key', 'status'.`
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