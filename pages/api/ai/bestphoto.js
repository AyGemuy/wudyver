import axios from "axios";
import {
  randomBytes,
  createHash
} from "crypto";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
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
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createEmail': ${error.message}`);
      throw error;
    }
  }
  async checkMessagesBestPhoto(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/token=([a-f0-9]{64})/);
        return match ? match[1] : null;
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
class BestPhotoAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://bestphoto.ai",
        register: "/api/auth/register",
        verifyEmail: "/api/auth/verify-email",
        csrf: "/api/auth/csrf",
        login: "/api/auth/callback/credentials",
        session: "/api/auth/session",
        userInfo: "/api/trpc/user.getCredits,user.getSubscriptionStatus,videoGeneration.list,training.list,trainedVoice.list,videoGeneration.listLoading",
        uploadPresigned: "/api/trpc/upload.getPresignedUrl",
        videoGenerate: "/api/trpc/videoGeneration.generate",
        videoList: "/api/trpc/videoGeneration.list",
        textToImageGenerate: "/api/trpc/generation.generate",
        textToImageList: "/api/trpc/generation.list",
        imageToImageGenerate: "/api/trpc/imageToImageGeneration.generate",
        imageToImageList: "/api/trpc/imageToImageGeneration.list"
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "cache-control": "no-cache",
      pragma: "no-cache",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: this.config.endpoints.base,
      headers: {
        ...commonHeaders,
        accept: "*/*"
      },
      jar: this.cookieJar,
      withCredentials: true
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
      if (!sessionData.sessionToken) throw new Error("Token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
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
    await this.cookieJar.setCookie(`__Secure-next-auth.session-token=${sessionData.sessionToken}; Domain=bestphoto.ai; Path=/; Secure; HttpOnly`, this.config.endpoints.base);
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async _getCsrfToken() {
    try {
      console.log("Proses: Mendapatkan CSRF token...");
      const response = await this.api.get(this.config.endpoints.csrf, {
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          referer: "https://bestphoto.ai/login"
        }
      });
      const csrfToken = response.data?.csrfToken;
      if (csrfToken) {
        console.log(`Proses: CSRF token didapatkan: ${csrfToken.substring(0, 20)}...`);
        return csrfToken;
      }
      console.warn("Proses: CSRF token tidak ditemukan di response");
      return "";
    } catch (error) {
      console.warn(`Proses: Gagal mendapatkan CSRF token: ${error.message}`);
      return "";
    }
  }
  async _refreshCsrfToken() {
    try {
      const csrfToken = await this._getCsrfToken();
      return csrfToken;
    } catch (error) {
      console.warn(`Gagal refresh CSRF token: ${error.message}`);
      return "";
    }
  }
  async _makeRequestWithCsrf(config) {
    const csrfToken = await this._refreshCsrfToken();
    const updatedConfig = {
      ...config,
      headers: {
        ...config.headers,
        ...csrfToken && {
          "x-csrf-token": csrfToken
        }
      }
    };
    return this.api(updatedConfig);
  }
  async register() {
    try {
      console.log("\n====== MEMULAI PROSES REGISTRASI ======");
      const email = await this.wudysoft.createEmail();
      if (!email) throw new Error("Gagal membuat email sementara.");
      console.log(`Proses: Email dibuat: ${email}`);
      const firstName = `User${this._random()}`;
      const lastName = this._random();
      const password = `Pass${this._random()}`;
      console.log("Step 1: Registrasi akun...");
      const registerPayload = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password
      };
      await this._makeRequestWithCsrf({
        method: "post",
        url: this.config.endpoints.register,
        data: registerPayload,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/register"
        }
      });
      console.log("Proses: Registrasi berhasil, menunggu email verifikasi...");
      let verificationToken = null;
      for (let i = 0; i < 60; i++) {
        verificationToken = await this.wudysoft.checkMessagesBestPhoto(email);
        if (verificationToken) break;
        console.log(`Proses: Menunggu token verifikasi... (${i + 1}/60)`);
        await sleep(3e3);
      }
      if (!verificationToken) throw new Error("Gagal menemukan token verifikasi setelah 3 menit.");
      console.log("Proses: Token verifikasi ditemukan");
      console.log("Step 3: Mengakses halaman verify-email...");
      const verifyUrl = `/verify-email?token=${verificationToken}`;
      await this._makeRequestWithCsrf({
        method: "get",
        url: verifyUrl,
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      console.log("Step 4: Verifikasi email via API...");
      const verifyPayload = {
        token: verificationToken
      };
      await this._makeRequestWithCsrf({
        method: "post",
        url: this.config.endpoints.verifyEmail,
        data: verifyPayload,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: `https://bestphoto.ai/verify-email?token=${verificationToken}`
        }
      });
      console.log("Proses: Email berhasil diverifikasi");
      console.log("Step 5: Melakukan login...");
      const loginData = new URLSearchParams({
        email: email,
        password: password,
        redirect: "false",
        csrfToken: await this._refreshCsrfToken(),
        callbackUrl: "https://bestphoto.ai/login",
        json: "true"
      });
      await this._makeRequestWithCsrf({
        method: "post",
        url: this.config.endpoints.login,
        data: loginData.toString(),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/login"
        },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      console.log("Proses: Login berhasil");
      console.log("Step 6: Memeriksa session...");
      const sessionResponse = await this._makeRequestWithCsrf({
        method: "get",
        url: this.config.endpoints.session,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          referer: "https://bestphoto.ai/login"
        }
      });
      const cookies = await this.cookieJar.getCookies(this.config.endpoints.base);
      const sessionCookie = cookies.find(cookie => cookie.key === "__Secure-next-auth.session-token");
      if (!sessionCookie) {
        console.log("Debug: Semua cookies yang tersimpan:");
        cookies.forEach(cookie => {
          console.log(`  - ${cookie.key} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? "..." : ""}`);
        });
        throw new Error("Gagal mendapatkan session token setelah verifikasi dan login.");
      }
      const sessionToken = sessionCookie.value;
      console.log("\n[SUCCESS] Registrasi berhasil!");
      console.log(`[TOKEN] ${sessionToken.substring(0, 50)}...`);
      const sessionToSave = JSON.stringify({
        sessionToken: sessionToken,
        email: email,
        password: password
      });
      const sessionTitle = `bestphoto-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: email,
        password: password
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
      console.log(`\n====== MEMULAI PROSES LOGIN ======`);
      console.log(`Proses: Mencoba login dengan email: ${email}`);
      console.log("Step 1: Melakukan login...");
      const loginData = new URLSearchParams({
        email: email,
        password: password,
        redirect: "false",
        csrfToken: await this._refreshCsrfToken(),
        callbackUrl: "https://bestphoto.ai/login",
        json: "true"
      });
      await this._makeRequestWithCsrf({
        method: "post",
        url: this.config.endpoints.login,
        data: loginData.toString(),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/login"
        },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      console.log("Proses: Login berhasil");
      console.log("Step 2: Memeriksa session...");
      const sessionResponse = await this._makeRequestWithCsrf({
        method: "get",
        url: this.config.endpoints.session,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          referer: "https://bestphoto.ai/login"
        }
      });
      const cookies = await this.cookieJar.getCookies(this.config.endpoints.base);
      const sessionCookie = cookies.find(cookie => cookie.key === "__Secure-next-auth.session-token");
      if (!sessionCookie) {
        console.log("Debug: Semua cookies yang tersimpan:");
        cookies.forEach(cookie => {
          console.log(`  - ${cookie.key} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? "..." : ""}`);
        });
        throw new Error("Gagal mendapatkan session token dari login.");
      }
      const sessionToken = sessionCookie.value;
      console.log("\n[SUCCESS] Login berhasil!");
      console.log(`[TOKEN] ${sessionToken.substring(0, 50)}...`);
      const sessionToSave = JSON.stringify({
        sessionToken: sessionToken,
        email: email,
        password: password
      });
      const sessionTitle = `bestphoto-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi login ke Wudysoft.");
      console.log(`-> Sesi login berhasil disimpan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        sessionToken: sessionToken,
        email: email,
        password: password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses login gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async user_info({
    key
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mendapatkan info user...");
      const params = {
        batch: "1",
        input: JSON.stringify({
          0: {
            json: null,
            meta: {
              values: ["undefined"]
            }
          },
          1: {
            json: null,
            meta: {
              values: ["undefined"]
            }
          },
          2: {
            json: {
              viewAll: false,
              page: 1,
              limit: 36
            }
          },
          3: {
            json: {
              status: "COMPLETED"
            }
          },
          4: {
            json: {
              isPublic: true
            }
          },
          5: {
            json: null,
            meta: {
              values: ["undefined"]
            }
          }
        })
      };
      const response = await this._makeRequestWithCsrf({
        method: "get",
        url: this.config.endpoints.userInfo,
        params: params,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          referer: "https://bestphoto.ai/dashboard"
        }
      });
      console.log("Proses: Info user berhasil didapatkan.");
      return {
        credits: response.data[0]?.result?.data?.json?.amount || 0,
        subscription: response.data[1]?.result?.data?.json || {},
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses user_info gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async _uploadImage({
    key,
    imageBuffer,
    fileName,
    fileSize,
    imageHash
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mendapatkan presigned URL...");
      const payload = {
        0: {
          json: {
            fileName: fileName,
            fileType: "image/jpeg",
            fileSize: fileSize,
            imageHash: imageHash
          }
        }
      };
      const response = await this._makeRequestWithCsrf({
        method: "post",
        url: `${this.config.endpoints.uploadPresigned}?batch=1`,
        data: payload,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/tools/image-to-image"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const {
        presignedUrl,
        imageId,
        url
      } = response.data[0].result.data.json;
      const uploadHeaders = {
        "Content-Length": fileSize.toString(),
        "Content-Type": "image/jpeg",
        Origin: "https://bestphoto.ai",
        Referer: "https://bestphoto.ai/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      };
      await axios.put(presignedUrl, imageBuffer, {
        headers: uploadHeaders,
        timeout: 3e4
      });
      console.log("Proses: Gambar berhasil diunggah.");
      return {
        imageId: imageId,
        url: url,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses upload gambar gagal: ${errorMessage}`);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Headers:", error.response.headers);
        console.error("Data:", error.response.data);
      }
      throw new Error(errorMessage);
    }
  }
  async _processImageInput(imageInput) {
    try {
      let imageBuffer;
      if (Buffer.isBuffer(imageInput)) {
        console.log("Proses: Input adalah Buffer");
        imageBuffer = imageInput;
      } else if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          console.log("Proses: Input adalah URL, mendownload gambar...");
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data);
        } else if (imageInput.startsWith("data:")) {
          console.log("Proses: Input adalah Base64 data URL");
          const base64Data = imageInput.split(",")[1];
          imageBuffer = Buffer.from(base64Data, "base64");
        } else {
          console.log("Proses: Input adalah Base64 string");
          imageBuffer = Buffer.from(imageInput, "base64");
        }
      } else {
        throw new Error("Format imageUrl tidak didukung. Gunakan URL, Base64, atau Buffer.");
      }
      const hash = createHash("sha256").update(imageBuffer).digest("hex");
      const fileName = `image-${Date.now()}.jpg`;
      const fileSize = imageBuffer.length;
      return {
        imageBuffer: imageBuffer,
        fileName: fileName,
        fileSize: fileSize,
        imageHash: hash
      };
    } catch (error) {
      console.error(`Gagal memproses input gambar: ${error.message}`);
      throw new Error(`Gagal memproses input gambar: ${error.message}`);
    }
  }
  async txt2img({
    key,
    prompt,
    numImages = 4,
    width = 1152,
    height = 1728,
    trainingId = "cmbf2sy4s001oy1qhd3262rx5",
    resolutionMode = "HD+",
    referenceImageStrength = .8
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Generate image dari text...");
      const payload = {
        0: {
          json: {
            prompt: prompt,
            width: width,
            height: height,
            numImages: numImages,
            trainingId: trainingId,
            uploadedImageId: null,
            resolutionMode: resolutionMode,
            referenceImageOptions: {
              strength: referenceImageStrength
            }
          },
          meta: {
            values: {
              uploadedImageId: ["undefined"]
            }
          }
        }
      };
      const response = await this._makeRequestWithCsrf({
        method: "post",
        url: `${this.config.endpoints.textToImageGenerate}?batch=1`,
        data: payload,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/tools/image-generator"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const taskData = response.data[0].result.data.json[0];
      console.log(`Proses: Task text-to-image berhasil dibuat. ID: ${taskData.id}`);
      return {
        taskId: taskData.id,
        status: taskData.status,
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
    imageUrl,
    prompt = PROMPT.text,
    numImages = 1,
    isPro = false
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Generate image-to-image...");
      const imageData = await this._processImageInput(imageUrl);
      const uploadResult = await this._uploadImage({
        key: currentKey,
        ...imageData
      });
      const payload = {
        0: {
          json: {
            prompt: prompt,
            uploadedImageId: uploadResult.imageId,
            editType: "AUTO",
            numImages: numImages,
            isPro: isPro
          }
        }
      };
      const response = await this._makeRequestWithCsrf({
        method: "post",
        url: `${this.config.endpoints.imageToImageGenerate}?batch=1`,
        data: payload,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/tools/image-to-image"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const taskData = response.data[0].result.data.json[0];
      console.log(`Proses: Task image-to-image berhasil dibuat. ID: ${taskData.id}`);
      return {
        taskId: taskData.id,
        status: taskData.status,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses img2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async txt2vid({
    key,
    prompt,
    duration = 5,
    quality = "LOW",
    aspectRatio = "16:9",
    numGenerations = 1
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Generate video dari text...");
      const payload = {
        0: {
          json: {
            prompt: prompt,
            trainingModel: null,
            duration: duration,
            quality: quality,
            numGenerations: numGenerations,
            width: 512,
            height: 512,
            uploadedImageIds: [],
            trainedVoiceId: null,
            aspectRatio: aspectRatio,
            audioPrompt: null,
            previewAudioUrl: null
          },
          meta: {
            values: {
              trainingModel: ["undefined"],
              trainedVoiceId: ["undefined"],
              audioPrompt: ["undefined"],
              previewAudioUrl: ["undefined"]
            }
          }
        }
      };
      const response = await this._makeRequestWithCsrf({
        method: "post",
        url: `${this.config.endpoints.videoGenerate}?batch=1`,
        data: payload,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const taskData = response.data[0].result.data.json[0];
      console.log(`Proses: Task text-to-video berhasil dibuat. ID: ${taskData.id}`);
      return {
        taskId: taskData.id,
        status: taskData.status,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2vid gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2vid({
    key,
    imageUrl,
    prompt = PROMPT.text,
    duration = 5,
    quality = "LOW",
    aspectRatio = "16:9",
    numGenerations = 1
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Generate video dari image...");
      const imageData = await this._processImageInput(imageUrl);
      const uploadResult = await this._uploadImage({
        key: currentKey,
        ...imageData
      });
      const payload = {
        0: {
          json: {
            prompt: prompt,
            trainingModel: null,
            duration: duration,
            quality: quality,
            numGenerations: numGenerations,
            width: 512,
            height: 512,
            uploadedImageIds: [uploadResult.imageId],
            trainedVoiceId: null,
            aspectRatio: aspectRatio,
            audioPrompt: null,
            previewAudioUrl: null
          },
          meta: {
            values: {
              trainingModel: ["undefined"],
              trainedVoiceId: ["undefined"],
              audioPrompt: ["undefined"],
              previewAudioUrl: ["undefined"]
            }
          }
        }
      };
      const response = await this._makeRequestWithCsrf({
        method: "post",
        url: `${this.config.endpoints.videoGenerate}?batch=1`,
        data: payload,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const taskData = response.data[0].result.data.json[0];
      console.log(`Proses: Task image-to-video berhasil dibuat. ID: ${taskData.id}`);
      return {
        taskId: taskData.id,
        status: taskData.status,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses img2vid gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status_txt2img({
    key,
    taskId
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status image untuk taskId ${taskId}...`);
      const params = {
        batch: "1",
        input: JSON.stringify({
          0: {
            json: {
              viewAll: false,
              page: 1,
              limit: 90
            }
          }
        })
      };
      const response = await this._makeRequestWithCsrf({
        method: "get",
        url: this.config.endpoints.textToImageList,
        params: params,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/tools/image-generator"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const tasks = response.data[0]?.result?.data?.json || [];
      const task = tasks.items.find(t => t.id === taskId);
      if (!task) {
        console.warn(`Peringatan: Task dengan ID ${taskId} tidak ditemukan di halaman pertama.`);
        return {
          status: "NOT_FOUND",
          key: currentKey
        };
      }
      console.log("Proses: Status image berhasil didapatkan.");
      return {
        ...tasks,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses status_img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status_img2img({
    key,
    taskId
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status image untuk taskId ${taskId}...`);
      const params = {
        batch: "1",
        input: JSON.stringify({
          0: {
            json: {
              viewAll: false,
              page: 1,
              limit: 90
            }
          }
        })
      };
      const response = await this._makeRequestWithCsrf({
        method: "get",
        url: this.config.endpoints.imageToImageList,
        params: params,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://bestphoto.ai",
          referer: "https://bestphoto.ai/tools/image-to-image"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const tasks = response.data[0]?.result?.data?.json || [];
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.warn(`Peringatan: Task dengan ID ${taskId} tidak ditemukan di halaman pertama.`);
        return {
          status: "NOT_FOUND",
          key: currentKey
        };
      }
      console.log("Proses: Status image berhasil didapatkan.");
      return {
        ...tasks,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses status_img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status_vid({
    key,
    taskId
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status video untuk taskId ${taskId}...`);
      const params = {
        batch: "1",
        input: JSON.stringify({
          0: {
            json: {
              viewAll: false,
              page: 1,
              limit: 36
            }
          }
        })
      };
      const response = await this._makeRequestWithCsrf({
        method: "get",
        url: this.config.endpoints.videoList,
        params: params,
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          referer: "https://bestphoto.ai/tools/video-generator"
        }
      });
      console.log(JSON.stringify(response.data, null, 2));
      const tasks = response.data[0]?.result?.data?.json || [];
      const task = tasks.items.find(t => t.id === taskId);
      if (!task) {
        console.warn(`Peringatan: Task dengan ID ${taskId} tidak ditemukan di halaman pertama.`);
        return {
          status: "NOT_FOUND",
          key: currentKey
        };
      }
      console.log("Proses: Status video berhasil didapatkan.");
      return {
        ...tasks,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses status_vid gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("bestphoto-session-")).map(paste => paste.key);
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
  const api = new BestPhotoAPI();
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
        response = await api.login(params);
        break;
      case "user_info":
        response = await api.user_info(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
        break;
      case "status_txt2img":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' wajib diisi untuk action 'status_txt2img'."
          });
        }
        response = await api.status_txt2img(params);
        break;
      case "status_img2img":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' wajib diisi untuk action 'status_img2img'."
          });
        }
        response = await api.status_img2img(params);
        break;
      case "status_vid":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' wajib diisi untuk action 'status_vid'."
          });
        }
        response = await api.status_vid(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'user_info', 'txt2img', 'img2img', 'txt2vid', 'img2vid', 'status_txt2img', 'status_img2img', 'status_vid', 'list_key', 'del_key'.`
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