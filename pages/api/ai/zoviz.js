import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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
      console.error(`[ERROR] Gagal membuat email: ${error.message}`);
      throw error;
    }
  }
  async checkMessagesZoviz(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/\b(\d{6})\b/);
        return match ? match[1] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal cek email ${email}: ${error.message}`);
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
      console.error(`[ERROR] Gagal membuat paste: ${error.message}`);
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
      console.error(`[ERROR] Gagal ambil paste ${key}: ${error.message}`);
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
      console.error(`[ERROR] Gagal list paste: ${error.message}`);
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
      console.error(`[ERROR] Gagal hapus paste ${key}: ${error.message}`);
      return false;
    }
  }
}
class ZovizAPI {
  constructor() {
    this.config = {
      endpoints: {
        auth: "https://api.zoviz.com/auth",
        services: "https://services.zoviz.com",
        account: "https://api.zoviz.com/account",
        otpRequest: "/otp/request",
        otpConfirm: "/otp/confirm",
        me: "/get/me",
        txt2img: "/text-to-image",
        upscale: "/image-upscaling",
        removebg: "/remove-background"
      },
      sourceVersion: "4.0.78"
    };
    const commonHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: "https://zoviz.com",
      referer: "https://zoviz.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.authClient = axios.create({
      baseURL: this.config.endpoints.auth,
      headers: {
        ...commonHeaders,
        "content-type": "application/json",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      }
    });
    this.servicesClient = axios.create({
      baseURL: this.config.endpoints.services,
      headers: {
        ...commonHeaders,
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      }
    });
    this.accountClient = axios.create({
      baseURL: this.config.endpoints.account,
      headers: {
        ...commonHeaders,
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      }
    });
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat token dari kunci: ${key}`);
    const savedData = await this.wudysoft.getPaste(key);
    if (!savedData) throw new Error(`Token dengan kunci "${key}" tidak ditemukan.`);
    try {
      const tokenData = JSON.parse(savedData);
      if (!tokenData.token) throw new Error("Token tidak valid.");
      console.log("Proses: Token berhasil dimuat.");
      console.log(`[EMAIL] ${tokenData.email || "Unknown"}`);
      return tokenData;
    } catch (e) {
      throw new Error(`Gagal memuat token: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI ZOVIZ ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    console.log("Proses: Mengirim permintaan OTP...");
    const otpRequestPayload = {
      identifier: email,
      lang: "id"
    };
    const otpResponse = await this.authClient.post(this.config.endpoints.otpRequest, otpRequestPayload, {
      headers: {
        "x-captcha-token": "xxxxx"
      }
    });
    if (!otpResponse.data?.ok) {
      throw new Error("Gagal mengirim permintaan OTP.");
    }
    const secret = otpResponse.data.result?.secret;
    console.log(`Proses: OTP berhasil dikirim. Secret: ${secret}`);
    console.log("Proses: Menunggu kode OTP...");
    let otpCode = null;
    for (let i = 0; i < 60; i++) {
      otpCode = await this.wudysoft.checkMessagesZoviz(email);
      if (otpCode) break;
      console.log(`Proses: Menunggu kode OTP... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!otpCode) {
      throw new Error("Gagal menemukan kode OTP setelah 3 menit.");
    }
    console.log(`Proses: Kode OTP ditemukan: ${otpCode}`);
    console.log("Proses: Mengkonfirmasi kode OTP...");
    const confirmPayload = {
      identifier: email,
      secret: secret,
      code: otpCode,
      lang: "id",
      source: "web",
      source_version: this.config.sourceVersion
    };
    const confirmResponse = await this.authClient.post(this.config.endpoints.otpConfirm, confirmPayload);
    if (!confirmResponse.data?.ok) {
      throw new Error("Gagal mengkonfirmasi kode OTP.");
    }
    const token = confirmResponse.data.result?.token;
    const isNew = confirmResponse.data.result?.is_new;
    console.log("\n[SUCCESS] Registrasi berhasil!");
    console.log(`[EMAIL] ${email}`);
    console.log(`[TOKEN] ${token.substring(0, 50)}...`);
    console.log(`[IS_NEW] ${isNew}`);
    console.log("\n====== REGISTRASI SELESAI ======\n");
    return {
      token: token,
      email: email,
      is_new: isNew
    };
  }
  async _ensureValidToken({
    key
  }) {
    let tokenData;
    let currentKey = key;
    if (key) {
      try {
        tokenData = await this._getTokenFromKey(key);
      } catch (error) {
        console.warn(`[PERINGATAN] ${error.message}. Mendaftarkan token baru...`);
      }
    }
    if (!tokenData) {
      console.log("Proses: Mendaftarkan token baru...");
      const newToken = await this.register();
      if (!newToken?.key) throw new Error("Gagal mendaftarkan token baru.");
      console.log(`-> PENTING: Simpan kunci baru ini: ${newToken.key}`);
      currentKey = newToken.key;
      tokenData = await this._getTokenFromKey(currentKey);
    }
    this.servicesClient.defaults.headers.token = tokenData.token;
    this.accountClient.defaults.headers.token = tokenData.token;
    return {
      tokenData: tokenData,
      key: currentKey
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan token baru...");
      const tokenData = await this._performRegistration();
      const dataToSave = JSON.stringify({
        token: tokenData.token,
        email: tokenData.email,
        is_new: tokenData.is_new
      });
      const sessionTitle = `zoviz-token-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, dataToSave);
      if (!newKey) throw new Error("Gagal menyimpan token baru.");
      console.log(`-> Token baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        token: tokenData.token,
        email: tokenData.email,
        is_new: tokenData.is_new
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async me({
    key
  }) {
    try {
      const {
        key: currentKey,
        tokenData
      } = await this._ensureValidToken({
        key: key
      });
      console.log("Proses: Mengambil info akun...");
      const response = await this.accountClient.post(this.config.endpoints.me, null, {
        headers: {
          "content-length": "0"
        }
      });
      console.log("Proses: Info akun berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses me gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async txt2img({
    key,
    prompt,
    ratio_variant = "p"
  }) {
    try {
      const {
        key: currentKey,
        tokenData
      } = await this._ensureValidToken({
        key: key
      });
      console.log(`Proses: Membuat gambar dari teks...`);
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("ratio_variant", ratio_variant);
      const response = await this.servicesClient.post(this.config.endpoints.txt2img, form, {
        headers: {
          ...form.getHeaders()
        },
        responseType: "arraybuffer"
      });
      console.log("Proses: Gambar berhasil dibuat.");
      const contentType = response.headers["content-type"];
      if (contentType && contentType.startsWith("image/")) {
        console.log("Proses: Response adalah buffer image.");
        const imageBuffer = Buffer.from(response.data);
        return {
          isImage: true,
          buffer: imageBuffer,
          contentType: contentType,
          metadata: {
            prompt: prompt,
            ratio_variant: ratio_variant
          },
          key: currentKey
        };
      } else {
        const jsonData = JSON.parse(response.data.toString());
        return {
          isImage: false,
          ...jsonData,
          key: currentKey
        };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async upscale({
    key,
    imageUrl,
    target_width = 20384,
    target_height = 11488
  }) {
    try {
      const {
        key: currentKey,
        tokenData
      } = await this._ensureValidToken({
        key: key
      });
      console.log(`Proses: Upscaling gambar...`);
      let imageBuffer;
      if (Buffer.isBuffer(imageUrl)) {
        imageBuffer = imageUrl;
      } else if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
      } else {
        imageBuffer = Buffer.from(imageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      const form = new FormData();
      form.append("image", imageBuffer, "image.png");
      form.append("target_width", target_width.toString());
      form.append("target_height", target_height.toString());
      const response = await this.servicesClient.post(this.config.endpoints.upscale, form, {
        headers: {
          ...form.getHeaders()
        },
        responseType: "arraybuffer"
      });
      console.log("Proses: Gambar berhasil di-upscale.");
      const contentType = response.headers["content-type"];
      if (contentType && contentType.startsWith("image/")) {
        console.log("Proses: Response adalah buffer image.");
        const upscaledBuffer = Buffer.from(response.data);
        return {
          isImage: true,
          buffer: upscaledBuffer,
          contentType: contentType,
          metadata: {
            target_width: target_width,
            target_height: target_height
          },
          key: currentKey
        };
      } else {
        const jsonData = JSON.parse(response.data.toString());
        return {
          isImage: false,
          ...jsonData,
          key: currentKey
        };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses upscale gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async removebg({
    key,
    imageUrl
  }) {
    try {
      const {
        key: currentKey,
        tokenData
      } = await this._ensureValidToken({
        key: key
      });
      console.log(`Proses: Menghapus background gambar...`);
      let imageBuffer;
      if (Buffer.isBuffer(imageUrl)) {
        imageBuffer = imageUrl;
      } else if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
      } else {
        imageBuffer = Buffer.from(imageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      const form = new FormData();
      form.append("image", imageBuffer, "image.png");
      const response = await this.servicesClient.post(this.config.endpoints.removebg, form, {
        headers: {
          ...form.getHeaders()
        },
        responseType: "arraybuffer"
      });
      console.log("Proses: Background berhasil dihapus.");
      const contentType = response.headers["content-type"];
      if (contentType && contentType.startsWith("image/")) {
        console.log("Proses: Response adalah buffer image.");
        const noBgBuffer = Buffer.from(response.data);
        return {
          isImage: true,
          buffer: noBgBuffer,
          contentType: contentType,
          metadata: {
            background_removed: true
          },
          key: currentKey
        };
      } else {
        const jsonData = JSON.parse(response.data.toString());
        return {
          isImage: false,
          ...jsonData,
          key: currentKey
        };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses removebg gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci token...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("zoviz-token-")).map(paste => paste.key);
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
  const api = new ZovizAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "me":
        response = await api.me(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        if (response.isImage) {
          res.setHeader("Content-Type", response.contentType || "image/png");
          return res.send(response.buffer);
        }
        break;
      case "upscale":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'upscale'."
          });
        }
        response = await api.upscale(params);
        if (response.isImage) {
          res.setHeader("Content-Type", response.contentType || "image/png");
          return res.send(response.buffer);
        }
        break;
      case "removebg":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'removebg'."
          });
        }
        response = await api.removebg(params);
        if (response.isImage) {
          res.setHeader("Content-Type", response.contentType || "image/png");
          return res.send(response.buffer);
        }
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'me', 'txt2img', 'upscale', 'removebg', 'list_key', 'del_key'.`
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