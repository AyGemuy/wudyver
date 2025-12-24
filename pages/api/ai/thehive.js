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
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.getPaste' untuk kunci ${key}: ${error.message}`);
      return null;
    }
  }
  async createEmail() {
    try {
      const response = await this.client.get("/mails/v13", {
        params: {
          action: "create"
        }
      });
      console.log("WudysoftAPI.createEmail - Respons Data:", JSON.stringify(response.data, null, 2));
      return response.data?.data?.address;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createEmail': ${error.message}`);
      throw error;
    }
  }
  async checkMessages(email) {
    try {
      const response = await this.client.get("/mails/v13", {
        params: {
          action: "message",
          email: email
        }
      });
      const message = response.data?.data?.rows?.[0];
      if (message && message.html) {
        const match = message.html.match(/https:\/\/mandrillapp\.com\/track\/click\/[^"]+/);
        return match?.[0] || null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessages' untuk email ${email}: ${error.message}`);
      return null;
    }
  }
}
class HiveAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        origin: "https://portal.thehive.ai",
        referer: "https://portal.thehive.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-forwarded-proto": "https",
        ...SpoofHead()
      }
    });
    axiosCookieJarSupport(this.client);
    this.wudysoftClient = new WudysoftAPI();
  }
  randomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async uploadSession(serializedJar, orgId) {
    console.log("Mengunggah sesi (jar dan orgId)...");
    const title = `hiveai-${this.randomString(10)}`;
    const content = JSON.stringify({
      cookieJar: serializedJar,
      orgId: orgId
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
    const hiveKeys = allPastes.filter(paste => paste?.title?.startsWith("hiveai-")).map(paste => paste.key);
    console.log(`Ditemukan ${hiveKeys.length} kunci hiveai.`);
    return hiveKeys;
  }
  async poll(fn, ms = 3e3) {
    const startTime = Date.now();
    const timeout = 6e4;
    while (Date.now() - startTime < timeout) {
      const result = await fn();
      if (result) return result;
      console.log("Mengecek ulang...");
      await new Promise(resolve => setTimeout(resolve, ms));
    }
    throw new Error("Batas waktu polling (1 menit) tercapai. Gagal mendapatkan hasil.");
  }
  async rgstr(email) {
    const response = await this.client.post("https://portal-customer-api.thehive.ai/api/register", {
      name: `hiveai-${this.randomString(5)}`,
      email: email,
      company: "6",
      phone: "",
      terms_of_service: true,
      product_interests: [],
      how_did_you_find_us: ["billboard"],
      password: `@-${this.randomString(10)}`,
      source: "signup_from_models-black-forest-labs-flux-schnell-submit"
    });
    console.log("HiveAI.rgstr - Respons Data:", JSON.stringify(response.data, null, 2));
    return response.data;
  }
  async vrfy(link) {
    const response = await this.client.get(link);
    const token = new URL(response.request.res.responseUrl).searchParams.get("token");
    if (!token) throw new Error("Gagal mengekstrak token dari link verifikasi.");
    console.log("HiveAI.vrfy - Token Ditemukan:", token);
    return token;
  }
  async auth(token) {
    const authResponse = await this.client.get(`https://portal-customer-api.thehive.ai/api/authenticate?token=${token}`);
    console.log("HiveAI.auth (authenticate) - Respons Data:", JSON.stringify(authResponse.data, null, 2));
    const orgId = authResponse.data?.data?.default_organization?.organization_id;
    if (!orgId) throw new Error("Org ID tidak ditemukan setelah autentikasi.");
    const authCodeResponse = await this.client.get(`https://portal-customer-api.thehive.ai/oauth/authorize?client_id=09aa2314-c8b3-4eb3-b740-d3ed63ea7eee`);
    console.log("HiveAI.auth (authorize) - Respons Data:", JSON.stringify(authCodeResponse.data, null, 2));
    const authCode = authCodeResponse.data?.data?.code;
    if (!authCode) throw new Error("Authorization code tidak ditemukan.");
    const tokenExchangeResponse = await this.client.post("https://ajax.thehive.ai/api/authentication/oauth_token", {
      authorization_code: authCode
    });
    console.log("HiveAI.auth (oauth_token) - Respons Data:", JSON.stringify(tokenExchangeResponse.data, null, 2));
    return orgId;
  }
  async register() {
    try {
      this.jar = new CookieJar();
      this.client.defaults.jar = this.jar;
      console.log("Memulai proses registrasi akun baru...");
      const email = await this.wudysoftClient.createEmail();
      if (!email) throw new Error("Gagal membuat email sementara.");
      await this.rgstr(email);
      const verificationLink = await this.poll(() => this.wudysoftClient.checkMessages(email));
      const token = await this.vrfy(verificationLink);
      const orgId = await this.auth(token);
      if (!orgId) throw new Error("Registrasi gagal: Tidak mendapatkan ID Organisasi.");
      console.log("Registrasi dan autentikasi berhasil.");
      const serializedJar = this.jar.serializeSync();
      const key = await this.uploadSession(serializedJar, orgId);
      return {
        key: key,
        cookieJar: serializedJar,
        orgId: orgId
      };
    } catch (error) {
      console.error(`[ERROR] Gagal total dalam proses 'register': ${error.message}`);
      if (error.response) {
        console.error("[ERROR] Detail Respons API:", JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }
  async _prepareImageUrl(image) {
    if (Buffer.isBuffer(image)) {
      return image.toString("base64");
    }
    if (typeof image === "string") {
      if (image.startsWith("http://") || image.startsWith("https://")) {
        try {
          const response = await axios.get(image, {
            responseType: "arraybuffer"
          });
          return Buffer.from(response.data, "binary").toString("base64");
        } catch (error) {
          throw new Error("Gagal mengambil gambar dari URL: " + error.message);
        }
      }
      const base64Marker = ";base64,";
      const dataUriIndex = image.indexOf(base64Marker);
      if (dataUriIndex !== -1) {
        return image.substring(dataUriIndex + base64Marker.length);
      }
      return image;
    }
    throw new Error("Format gambar tidak didukung. Harap berikan URL, string Base64, atau Buffer.");
  }
  async getProfile({
    key
  }) {
    try {
      console.log(`Mendapatkan profil dan saldo untuk kunci: ${key}`);
      const sessionData = await this.getSession(key);
      if (!sessionData || !sessionData.cookieJar) {
        throw new Error(`Sesi untuk kunci ${key} tidak valid atau tidak ditemukan.`);
      }
      this.jar = CookieJar.deserializeSync(sessionData.cookieJar);
      this.client.defaults.jar = this.jar;
      const profileResponse = await this.client.get("https://portal-customer-api.thehive.ai/api/profile");
      console.log("HiveAI.getProfile (Profile) - Respons Data:", JSON.stringify(profileResponse.data, null, 2));
      const profileData = profileResponse.data.data;
      if (!profileData) {
        throw new Error("Gagal mendapatkan data profil dari respons API.");
      }
      const orgId = profileData.default_organization?.organization_id;
      if (!orgId) {
        throw new Error("Organization ID tidak ditemukan di dalam data profil.");
      }
      const balanceResponse = await this.client.get(`https://portal-customer-api.thehive.ai/api/organization/${orgId}/balance`);
      console.log("HiveAI.getProfile (Balance) - Respons Data:", JSON.stringify(balanceResponse.data, null, 2));
      const balanceData = balanceResponse.data.data;
      if (!balanceData) {
        throw new Error("Gagal mendapatkan data saldo dari respons API.");
      }
      return {
        profile: profileData,
        balance: balanceData
      };
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'getProfile': ${error.message}`);
      if (error.response) {
        console.error("[ERROR] Detail Respons API:", JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }
  async delKey({
    key
  }) {
    try {
      console.log(`Menghapus kunci: ${key}`);
      const responseDel = await this.wudysoftClient.delPaste(key);
      return responseDel;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'delKey': ${error.message}`);
      if (error.response) {
        console.error("[ERROR] Detail Respons API:", JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }
  async generate({
    key,
    prompt,
    imageUrl,
    model = "flux-schnell",
    messages,
    ...rest
  }) {
    try {
      let sessionData = null;
      let orgId;
      if (key) {
        console.log(`Menggunakan kunci yang ada: ${key}`);
        sessionData = await this.getSession(key);
        if (sessionData) {
          this.jar = CookieJar.deserializeSync(sessionData.cookieJar);
          this.client.defaults.jar = this.jar;
          orgId = sessionData.orgId;
        }
      }
      if (!sessionData) {
        console.log(key ? `Kunci ${key} tidak valid.` : "Tidak ada kunci.", "Mendaftarkan sesi baru...");
        const newSession = await this.register();
        if (!newSession) throw new Error("Otentikasi gagal: Tidak dapat mendaftarkan sesi baru.");
        orgId = newSession.orgId;
      }
      const models = {
        "vision-language": "chat/completions",
        sdxl: "stabilityai/sdxl",
        "sdxl-enhanced": "hive/sdxl-enhanced",
        "flux-schnell-emoji": "hive/flux-schnell-emoji",
        "flux-schnell-enhanced": "hive/flux-schnell-enhanced",
        "flux-schnell": "black-forest-labs/flux-schnell"
      };
      const endpoint = models[model] || models["flux-schnell"];
      const apiUrl = `https://ajax.thehive.ai/api/v3/${endpoint}`;
      let payload;
      if (model === "vision-language") {
        console.log(`Membuat completion dengan model: ${model}...`);
        const userContent = [{
          type: "text",
          text: prompt
        }];
        if (imageUrl) {
          const preparedImageUrl = await this._prepareImageUrl(imageUrl);
          userContent.push({
            type: "image_url",
            image_url: {
              url: preparedImageUrl
            }
          });
        }
        payload = {
          task_submission_body: {
            messages: messages && messages.length ? messages : [{
              role: "user",
              content: userContent
            }],
            model: "hive/vision-language-model",
            ...rest
          },
          org_id: orgId
        };
      } else {
        console.log(`Membuat gambar dengan model: ${model}...`);
        payload = {
          input: {
            prompt: prompt,
            ...rest
          },
          org_id: orgId
        };
      }
      const response = await this.client.post(apiUrl, payload);
      console.log("HiveAI.generate - Respons Data:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'generate': ${error.message}`);
      if (error.response) {
        console.error("[ERROR] Detail Respons API:", JSON.stringify(error.response.data, null, 2));
      }
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
  const api = new HiveAI();
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
      case "list_key":
        response = await api.listKeys();
        break;
      case "profile":
        if (!params.key) return res.status(400).json({
          error: "Paramenter 'key' wajib diisi untuk action 'profile'."
        });
        response = await api.getProfile(params);
        break;
      case "del_key":
        if (!params.key) return res.status(400).json({
          error: "Paramenter 'key' wajib diisi untuk action 'del_key'."
        });
        response = await api.delKey(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung adalah 'register', 'generate', 'list_key', 'del_key', and 'profile'.`
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