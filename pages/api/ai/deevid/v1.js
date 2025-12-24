import fetch from "node-fetch";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import PROMPT from "@/configs/ai-prompt";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class WudysoftAPI {
  constructor() {
    this.baseURL = `https://${apiConfig.DOMAIN_URL}/api`;
  }
  async createEmail() {
    try {
      const response = await fetch(`${this.baseURL}/mails/v9?action=create`);
      const data = await response.json();
      return data?.email;
    } catch (error) {
      console.error(`[ERROR] Gagal membuat email: ${error.message}`);
      throw error;
    }
  }
  async checkMessagesDeevid(email) {
    try {
      const response = await fetch(`${this.baseURL}/mails/v9?action=message&email=${encodeURIComponent(email)}`);
      const data = await response.json();
      const content = data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/Please enter this code:\s*(\d{6})/);
        return match ? match[1] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal mengecek pesan untuk ${email}: ${error.message}`);
      return null;
    }
  }
  async createPaste(title, content) {
    try {
      const response = await fetch(`${this.baseURL}/tools/paste/v1?action=create&title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}`);
      const data = await response.json();
      return data?.key || null;
    } catch (error) {
      console.error(`[ERROR] Gagal membuat paste: ${error.message}`);
      throw error;
    }
  }
  async getPaste(key) {
    try {
      const response = await fetch(`${this.baseURL}/tools/paste/v1?action=get&key=${key}`);
      const data = await response.json();
      return data?.content || null;
    } catch (error) {
      console.error(`[ERROR] Gagal mendapatkan paste: ${error.message}`);
      return null;
    }
  }
  async listPastes() {
    try {
      const response = await fetch(`${this.baseURL}/tools/paste/v1?action=list`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error(`[ERROR] Gagal list paste: ${error.message}`);
      return [];
    }
  }
  async delPaste(key) {
    try {
      const response = await fetch(`${this.baseURL}/tools/paste/v1?action=delete&key=${key}`);
      const data = await response.json();
      return data || null;
    } catch (error) {
      console.error(`[ERROR] Gagal hapus paste: ${error.message}`);
      return false;
    }
  }
}
class DeeVidAPI {
  constructor() {
    this.config = {
      supabaseUrl: "https://sp.deevid.ai/auth/v1",
      apiUrl: "https://api.deevid.ai/app",
      supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzQ5Njk2MDAsCiAgImV4cCI6IDE4OTI3MzYwMDAKfQ.SX1rsIj8g5g88MF-zL2YDlu3lOZDCDv-O0EOzPRk6PU",
      appsflyerId: `${Date.now()}-${Math.floor(Math.random() * 9e18)}`
    };
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  async _convertToBuffer(input) {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    if (typeof input === "string") {
      if (input.startsWith("http://") || input.startsWith("https://")) {
        console.log(`  Mengunduh dari URL...`);
        const response = await fetch(input);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      if (input.startsWith("data:image/")) {
        console.log(`  Konversi dari base64...`);
        const base64Data = input.replace(/^data:image\/\w+;base64,/, "");
        return Buffer.from(base64Data, "base64");
      }
      console.log(`  Konversi dari base64...`);
      return Buffer.from(input, "base64");
    }
    throw new Error("Format input tidak didukung. Gunakan URL, base64, atau Buffer.");
  }
  async _uploadSingleImage(imageBuffer, accessToken) {
    const form = new FormData();
    form.append("file", imageBuffer, {
      filename: `${Date.now()}.png`,
      contentType: "image/png"
    });
    form.append("width", "1024");
    form.append("height", "1024");
    const response = await fetch(`${this.config.apiUrl}/file-upload/image`, {
      method: "POST",
      headers: {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "x-appsflyer-id": this.config.appsflyerId,
        "x-lang": "en",
        "x-mobile-app-version": "1.5.0",
        "x-mobile-platform": "ANDROID",
        authorization: `Bearer ${accessToken}`,
        ...form.getHeaders()
      },
      body: form
    });
    const data = await response.json();
    if (!data.data?.data?.id) {
      throw new Error("Upload gagal: " + (data.error?.message || "Unknown error"));
    }
    return data.data.data.id;
  }
  async _ensureImageIds(imageUrl, accessToken) {
    if (!imageUrl) return [];
    const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
    const imageIds = [];
    console.log(`\n→ Memproses ${urls.length} gambar...`);
    for (const url of urls) {
      console.log(`  Upload gambar ${imageIds.length + 1}/${urls.length}...`);
      const buffer = await this._convertToBuffer(url);
      const imageId = await this._uploadSingleImage(buffer, accessToken);
      imageIds.push(imageId);
      console.log(`  ✓ Image ID: ${imageId}`);
    }
    console.log(`✓ Total ${imageIds.length} gambar berhasil diupload`);
    return imageIds;
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI REGISTRASI DEEVID ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`✓ Email dibuat: ${email}`);
    const password = `${this._random()}A1!`;
    console.log("→ Mengirim permintaan signup...");
    const signupResponse = await fetch(`${this.config.supabaseUrl}/signup`, {
      method: "POST",
      headers: {
        "User-Agent": "ktor-client",
        Connection: "Keep-Alive",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.supabaseKey}`,
        apikey: this.config.supabaseKey,
        "X-Client-Info": "supabase-kt/3.1.3",
        "Accept-Charset": "UTF-8"
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    if (!signupResponse.ok) {
      throw new Error(`Signup gagal: ${signupResponse.statusText}`);
    }
    console.log("✓ Signup berhasil");
    console.log("→ Menunggu kode OTP...");
    let otpCode = null;
    for (let i = 0; i < 60; i++) {
      otpCode = await this.wudysoft.checkMessagesDeevid(email);
      if (otpCode) break;
      console.log(`  Menunggu OTP... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!otpCode) throw new Error("Gagal mendapatkan kode OTP setelah 3 menit.");
    console.log(`✓ Kode OTP ditemukan: ${otpCode}`);
    console.log("→ Verifikasi email dengan OTP...");
    const verifyResponse = await fetch(`${this.config.supabaseUrl}/verify`, {
      method: "POST",
      headers: {
        "User-Agent": "ktor-client",
        Connection: "Keep-Alive",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.supabaseKey}`,
        apikey: this.config.supabaseKey,
        "X-Client-Info": "supabase-kt/3.1.3",
        "Accept-Charset": "UTF-8"
      },
      body: JSON.stringify({
        type: "email",
        token: otpCode,
        email: email
      })
    });
    const verifyData = await verifyResponse.json();
    const accessToken = verifyData.access_token;
    if (!accessToken) throw new Error("Gagal mendapatkan access token.");
    console.log("✓ Verifikasi berhasil");
    console.log("→ Mengambil info akun...");
    const accountResponse = await fetch(`${this.config.apiUrl}/account/info`, {
      method: "GET",
      headers: {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "x-app-source": "organic",
        "x-appsflyer-id": this.config.appsflyerId,
        "x-lang": "en",
        "x-mobile-app-version": "1.5.0",
        "x-mobile-platform": "ANDROID",
        authorization: `Bearer ${accessToken}`
      }
    });
    const accountData = await accountResponse.json();
    console.log("\n====== REGISTRASI SELESAI ======");
    return {
      email: email,
      password: password,
      access_token: accessToken,
      user: accountData.data?.data
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan akun baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        email: sessionData.email,
        password: sessionData.password,
        access_token: sessionData.access_token,
        user: sessionData.user
      });
      const sessionTitle = `deevid-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`\n✓ Registrasi berhasil!`);
      console.log(`Key: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        password: sessionData.password,
        access_token: sessionData.access_token
      };
    } catch (error) {
      console.error(`[ERROR] Registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async login({
    email,
    password
  }) {
    try {
      console.log(`\nProses: Login dengan email: ${email}`);
      const response = await fetch(`${this.config.supabaseUrl}/token?grant_type=password`, {
        method: "POST",
        headers: {
          "User-Agent": "ktor-client",
          Connection: "Keep-Alive",
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.supabaseKey}`,
          apikey: this.config.supabaseKey,
          "X-Client-Info": "supabase-kt/3.1.3",
          "Accept-Charset": "UTF-8"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      const data = await response.json();
      const accessToken = data.access_token;
      if (!accessToken) throw new Error("Gagal mendapatkan access token.");
      console.log("✓ Login berhasil");
      const sessionToSave = JSON.stringify({
        email: email,
        password: password,
        access_token: accessToken
      });
      const sessionTitle = `deevid-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      console.log(`Key baru: ${newKey}`);
      return {
        key: newKey,
        email: email,
        access_token: accessToken
      };
    } catch (error) {
      const errorMessage = error.message || "Login gagal";
      console.error(`[ERROR] Login gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async _getTokenFromKey(key) {
    console.log(`Memuat sesi dari key: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan key "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.access_token) throw new Error("Token tidak valid.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
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
        console.warn(`[WARN] ${error.message}. Registrasi baru...`);
      }
    }
    if (!sessionData) {
      const newSession = await this.register();
      currentKey = newSession.key;
      sessionData = await this._getTokenFromKey(currentKey);
    }
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async txt2vid({
    key,
    prompt,
    lengthOfSecond = 5,
    modelType = "MODEL_THREE",
    modelVersion = "MODEL_THREE_PRO",
    resolution = "LOW",
    size = "SIXTEEN_BY_NINE"
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`\n→ Membuat video dari teks...`);
      const response = await fetch(`${this.config.apiUrl}/video/text-to-video/task/submit`, {
        method: "POST",
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "x-appsflyer-id": this.config.appsflyerId,
          "x-lang": "en",
          "x-mobile-app-version": "1.5.0",
          "x-mobile-platform": "ANDROID",
          authorization: `Bearer ${sessionData.access_token}`
        },
        body: JSON.stringify({
          lengthOfSecond: lengthOfSecond,
          modelType: modelType,
          modelVersion: modelVersion,
          prompt: prompt,
          resolution: resolution,
          size: size,
          userImageId: 0
        })
      });
      const data = await response.json();
      console.log("✓ Task dibuat");
      return {
        ...data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] txt2vid gagal: ${error.message}`);
      throw error;
    }
  }
  async img2vid({
    key,
    prompt = PROMPT.text,
    imageUrl,
    lengthOfSecond = 5,
    modelType = "MODEL_THREE",
    modelVersion = "MODEL_THREE_PRO",
    resolution = "LOW",
    promptEnhanced = true
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`\n→ Membuat video dari gambar...`);
      const imageIds = await this._ensureImageIds(imageUrl, sessionData.access_token);
      if (imageIds.length === 0) {
        throw new Error("Minimal 1 gambar diperlukan untuk img2vid");
      }
      const userImageId = imageIds[0];
      const response = await fetch(`${this.config.apiUrl}/video/image-to-video/task/submit`, {
        method: "POST",
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "x-appsflyer-id": this.config.appsflyerId,
          "x-lang": "en",
          "x-mobile-app-version": "1.5.0",
          "x-mobile-platform": "ANDROID",
          authorization: `Bearer ${sessionData.access_token}`
        },
        body: JSON.stringify({
          lengthOfSecond: lengthOfSecond,
          modelType: modelType,
          modelVersion: modelVersion,
          prompt: prompt,
          promptEnhanced: promptEnhanced,
          resolution: resolution,
          userImageId: userImageId
        })
      });
      const data = await response.json();
      console.log("✓ Task dibuat");
      return {
        ...data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] img2vid gagal: ${error.message}`);
      throw error;
    }
  }
  async txt2img({
    key,
    prompt,
    modelType = "MODEL_FOUR",
    modelVersion = "MODEL_FOUR_NANO_BANANA",
    count = 1
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`\n→ Membuat gambar dari teks...`);
      const response = await fetch(`${this.config.apiUrl}/image/text-to-image/task/submit`, {
        method: "POST",
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "x-appsflyer-id": this.config.appsflyerId,
          "x-lang": "en",
          "x-mobile-app-version": "1.5.0",
          "x-mobile-platform": "ANDROID",
          authorization: `Bearer ${sessionData.access_token}`
        },
        body: JSON.stringify({
          prompt: prompt,
          modelType: modelType,
          count: count,
          modelVersion: modelVersion,
          userImageIds: []
        })
      });
      const data = await response.json();
      console.log("✓ Task dibuat");
      return {
        ...data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] txt2img gagal: ${error.message}`);
      throw error;
    }
  }
  async img2img({
    key,
    prompt = PROMPT.text,
    imageUrl,
    modelType = "MODEL_FOUR",
    modelVersion = "MODEL_FOUR_NANO_BANANA",
    count = 1
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`\n→ Membuat gambar dari gambar...`);
      const imageIds = await this._ensureImageIds(imageUrl, sessionData.access_token);
      if (imageIds.length === 0) {
        throw new Error("Minimal 1 gambar diperlukan untuk img2img");
      }
      const response = await fetch(`${this.config.apiUrl}/image/text-to-image/task/submit`, {
        method: "POST",
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "x-appsflyer-id": this.config.appsflyerId,
          "x-lang": "en",
          "x-mobile-app-version": "1.5.0",
          "x-mobile-platform": "ANDROID",
          authorization: `Bearer ${sessionData.access_token}`
        },
        body: JSON.stringify({
          prompt: prompt,
          modelType: modelType,
          count: count,
          modelVersion: modelVersion,
          userImageIds: imageIds
        })
      });
      const data = await response.json();
      console.log("✓ Task dibuat");
      return {
        ...data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] img2img gagal: ${error.message}`);
      throw error;
    }
  }
  async statusVideo({
    key,
    task_id
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const response = await fetch(`${this.config.apiUrl}/video/video/task/${task_id}`, {
        method: "GET",
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "x-appsflyer-id": this.config.appsflyerId,
          "x-lang": "en",
          "x-mobile-app-version": "1.5.0",
          "x-mobile-platform": "ANDROID",
          authorization: `Bearer ${sessionData.access_token}`
        }
      });
      const data = await response.json();
      return {
        ...data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] Status video gagal: ${error.message}`);
      throw error;
    }
  }
  async statusImage({
    key,
    task_id
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const response = await fetch(`${this.config.apiUrl}/image/image/task/${task_id}`, {
        method: "GET",
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "x-appsflyer-id": this.config.appsflyerId,
          "x-lang": "en",
          "x-mobile-app-version": "1.5.0",
          "x-mobile-platform": "ANDROID",
          authorization: `Bearer ${sessionData.access_token}`
        }
      });
      const data = await response.json();
      return {
        ...data.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] Status image gagal: ${error.message}`);
      throw error;
    }
  }
  async list_key() {
    try {
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title?.startsWith("deevid-session-")).map(paste => paste.key);
    } catch (error) {
      console.error(`[ERROR] List key gagal: ${error.message}`);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) {
      console.error("Key tidak disediakan.");
      return false;
    }
    try {
      const success = await this.wudysoft.delPaste(key);
      console.log(success ? `✓ Key ${key} dihapus` : `✗ Gagal hapus key ${key}`);
      return success;
    } catch (error) {
      console.error(`[ERROR] Hapus key gagal: ${error.message}`);
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new DeeVidAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "login":
        if (!params.email || !params.password) {
          return res.status(400).json({
            error: "Parameter 'email' dan 'password' wajib untuk login."
          });
        }
        response = await api.login(params);
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib untuk txt2vid."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib untuk img2vid."
          });
        }
        response = await api.img2vid(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib untuk txt2img."
          });
        }
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib untuk img2img."
          });
        }
        response = await api.img2img(params);
        break;
      case "status_video":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib untuk status_video."
          });
        }
        response = await api.statusVideo(params);
        break;
      case "status_image":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib untuk status_image."
          });
        }
        response = await api.statusImage(params);
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) {
          return res.status(400).json({
            error: "Parameter 'key' wajib untuk del_key."
          });
        }
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL] Error pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}