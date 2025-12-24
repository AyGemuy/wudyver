import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class JoylandAPI {
  constructor() {
    this.baseURL = "https://api.joyland.ai";
    this.mailAPIURL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.jar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.jar
    }));
    this.commonHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en",
      "content-type": "application/json;charset=UTF-8",
      origin: "https://www.joyland.ai",
      priority: "u=1, i",
      referer: "https://www.joyland.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "source-platform": "JL-H5",
      timezone: "GMT+8",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.token = null;
    this.emailAddress = null;
    this.password = this.generateRandomPassword(12);
    this.dialogueId = null;
    this.fingerprint = null;
    this.initializeFingerprint();
  }
  generateRandomPassword(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  hashPasswordMD5(password) {
    if (typeof crypto !== "undefined" && crypto.createHash) {
      return crypto.createHash("md5").update(password).digest("hex");
    } else {
      console.warn("crypto.createHash tidak tersedia. Menggunakan MD5 fallback yang tidak aman.");
      return Array.from(password).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString(16);
    }
  }
  initializeFingerprint() {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        this.fingerprint = crypto.randomUUID().replace(/-/g, "");
        console.log("Fingerprint diinisialisasi menggunakan crypto:", this.fingerprint);
      } else {
        this.fingerprint = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0,
            v = c == "x" ? r : r & 3 | 8;
          return v.toString(16);
        });
        console.log("Fingerprint diinisialisasi menggunakan fallback UUID:", this.fingerprint);
      }
      this.commonHeaders["fingerprint"] = this.fingerprint;
    } catch (error) {
      console.error("Gagal menginisialisasi fingerprint:", error.message);
      this.fingerprint = "default-static-fingerprint";
      this.commonHeaders["fingerprint"] = this.fingerprint;
    }
  }
  async createEmail() {
    console.log("Membuat alamat email sementara...");
    try {
      const response = await this.axiosInstance.get(`${this.mailAPIURL}?action=create`, {
        headers: this.commonHeaders
      });
      console.log("Alamat email berhasil dibuat:", response.data);
      this.emailAddress = response.data.email;
      return response.data;
    } catch (error) {
      console.error("Gagal membuat alamat email:", error.message);
      throw error;
    }
  }
  async waitForEmailMessage(emailAddress, maxAttempts = 20, delay = 3e3) {
    console.log(`Menunggu pesan untuk email: ${emailAddress}...`);
    try {
      let messageData = null;
      let attempts = 0;
      while (!messageData && attempts < maxAttempts) {
        const response = await this.axiosInstance.get(`${this.mailAPIURL}?action=message&email=${emailAddress}`, {
          headers: this.commonHeaders
        });
        if (response.data && response.data.data && response.data.data.length > 0) {
          messageData = response.data.data[0];
          console.log("Pesan email diterima:", messageData);
        } else {
          console.log(`Belum ada pesan. Mencoba lagi dalam ${delay / 1e3} detik... (Percobaan ke-${attempts + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
        }
      }
      if (!messageData) {
        console.warn("Tidak ada pesan email yang diterima setelah beberapa percobaan. Autentikasi mungkin gagal.");
      }
      return messageData;
    } catch (error) {
      console.error("Gagal menunggu atau mengambil pesan email:", error.message);
      throw error;
    }
  }
  async sendAuthCode() {
    console.log(`Mengirim kode autentikasi ke email: ${this.emailAddress}...`);
    try {
      const response = await this.axiosInstance.post(`${this.baseURL}/user/send/auth/code`, {
        email: this.emailAddress,
        methodType: 1
      }, {
        headers: this.commonHeaders
      });
      console.log("Permintaan pengiriman kode autentikasi berhasil:", response.data);
      return response.data;
    } catch (error) {
      console.error("Gagal mengirim kode autentikasi:", error.message);
      throw error;
    }
  }
  async verifyEmailCode(email, verifyCode) {
    console.log(`Memverifikasi kode: ${verifyCode} untuk email: ${email}...`);
    try {
      const response = await this.axiosInstance.post(`${this.baseURL}/user/valid/email`, {
        email: email,
        authCode: verifyCode
      }, {
        headers: this.commonHeaders
      });
      console.log("Verifikasi kode email berhasil:", response.data);
      return response.data;
    } catch (error) {
      console.error("Gagal memverifikasi kode email:", error.message);
      throw error;
    }
  }
  async login(email, passwordToUse) {
    console.log(`Mencoba login dengan email: ${email}...`);
    const hashedPassword = this.hashPasswordMD5(passwordToUse);
    try {
      const response = await this.axiosInstance.post(`${this.baseURL}/user/login`, {
        email: email,
        userPwd: hashedPassword,
        srcType: "LOCAL",
        sourceWebsite: "https://www.joyland.ai/"
      }, {
        headers: this.commonHeaders
      });
      console.log("Login berhasil:", response.data);
      if (response.data && response.data.result && response.data.result.token) {
        this.token = response.data.result.token;
        return response.data;
      } else {
        throw new Error("Login berhasil, tetapi token tidak ditemukan dalam respons.");
      }
    } catch (error) {
      console.error("Gagal login:", error.message);
      throw error;
    }
  }
  async authenticate() {
    console.log("Memulai proses autentikasi otomatis...");
    if (!this.fingerprint) {
      this.initializeFingerprint();
    }
    try {
      await this.createEmail();
      console.log("Mencoba login awal dengan email sementara dan kata sandi yang dihasilkan...");
      try {
        await this.login(this.emailAddress, this.password);
        console.log("Login awal berhasil! Token:", this.token);
        return true;
      } catch (loginError) {
        console.log("Login awal gagal, melanjutkan ke proses verifikasi/registrasi.");
      }
      await this.sendAuthCode();
      const emailMessage = await this.waitForEmailMessage(this.emailAddress);
      if (emailMessage) {
        const otpMatch = emailMessage.text_content.match(/\b\d{6}\b/);
        if (otpMatch) {
          const authCode = otpMatch[0];
          console.log("Kode OTP ditemukan:", authCode);
          await this.verifyEmailCode(this.emailAddress, authCode);
          console.log("Memulai polling login setelah verifikasi email...");
          let loginSuccess = false;
          let attempts = 0;
          const maxLoginAttempts = 10;
          const loginPollDelay = 5e3;
          while (!loginSuccess && attempts < maxLoginAttempts) {
            try {
              const loginResponse = await this.login(this.emailAddress, this.password);
              if (this.token) {
                loginSuccess = true;
              } else {
                throw new Error("Token tidak ditemukan setelah percobaan login.");
              }
            } catch (pollError) {
              attempts++;
              console.log(`Polling login gagal (Percobaan ke-${attempts}). Mencoba lagi dalam ${loginPollDelay / 1e3} detik...`);
              if (attempts < maxLoginAttempts) {
                await new Promise(resolve => setTimeout(resolve, loginPollDelay));
              }
            }
          }
          if (loginSuccess) {
            console.log("Autentikasi berhasil!");
            return true;
          } else {
            console.error("Gagal mendapatkan token login setelah verifikasi email dan polling.");
            return false;
          }
        } else {
          console.error("Gagal menemukan kode OTP dalam pesan email.");
          return false;
        }
      } else {
        console.error("Tidak ada pesan email yang diterima, autentikasi gagal.");
        return false;
      }
    } catch (error) {
      console.error("Kesalahan dalam proses autentikasi otomatis:", error.message);
      return false;
    }
  }
  async enterDialogue(bodId) {
    console.log(`Memasuki dialog dengan bot ID: ${bodId}...`);
    if (!this.token) {
      console.log("Belum terautentikasi. Memulai proses autentikasi...");
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        console.error("Gagal mengautentikasi. Tidak dapat memasuki dialog.");
        throw new Error("Autentikasi gagal.");
      }
    }
    try {
      const headersWithAuth = {
        ...this.commonHeaders,
        authtoken: this.token
      };
      const response = await this.axiosInstance.post(`${this.baseURL}/v1/chat/enterDialogueV2`, {
        bodId: bodId,
        entrance: 0
      }, {
        headers: headersWithAuth
      });
      console.log("Berhasil memasuki dialog:", response.data);
      this.dialogueId = response.data.result.dialogueId;
      return response.data;
    } catch (error) {
      console.error("Gagal memasuki dialog:", error.message);
      throw error;
    }
  }
  async chat({
    prompt: textMsg = "halo",
    char_id: bodId = "oP",
    image: wantImageIntention = false,
    ...rest
  } = {}) {
    console.log(`Mengirim pesan ke dialog untuk bot ID ${bodId}: "${textMsg}"`);
    if (!this.token) {
      console.log("Belum terautentikasi. Memulai proses autentikasi...");
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        console.error("Gagal mengautentikasi. Tidak dapat melakukan chat.");
        throw new Error("Autentikasi gagal.");
      }
    }
    if (!this.dialogueId || bodId && this.dialogueId !== bodId) {
      console.log("Dialogue ID belum disetel atau berbeda. Memasuki dialog baru...");
      await this.enterDialogue(bodId);
    }
    try {
      const headersWithAuth = {
        ...this.commonHeaders,
        authtoken: this.token
      };
      const response = await this.axiosInstance.post(`${this.baseURL}/v1/chat/streamChat`, {
        dialogueId: this.dialogueId,
        textMsg: textMsg,
        wantImageIntention: wantImageIntention,
        ...rest
      }, {
        headers: headersWithAuth,
        responseType: "text"
      });
      const lines = response.data.split("\n");
      const parsedObjects = [];
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("data:")) {
          const jsonString = trimmedLine.slice("data:".length);
          try {
            const parsedData = JSON.parse(jsonString);
            if (parsedData && parsedData.result) {
              parsedObjects.push(parsedData);
            }
          } catch (parseError) {
            console.warn("Gagal mem-parse JSON dari baris (chat):", jsonString, parseError.message);
          }
        }
      }
      const finalParsedData = parsedObjects.pop();
      if (finalParsedData) {
        console.log("Respon chat yang diparsing (data terakhir):", finalParsedData);
        return finalParsedData;
      } else {
        console.warn("Tidak dapat memparsing result dari respon chat.");
        return response.data;
      }
    } catch (error) {
      console.error("Gagal mengirim pesan chat atau memproses respon:", error.message);
      throw error;
    }
  }
  async search({
    query: name = "miku",
    save: isNeedSaveSearchRecord = false,
    ...rest
  } = {}) {
    console.log(`Mencari bot dengan nama: "${name}"...`);
    if (!this.token) {
      console.log("Belum terautentikasi. Memulai proses autentikasi...");
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        console.error("Gagal mengautentikasi. Tidak dapat melakukan pencarian bot.");
        throw new Error("Autentikasi gagal.");
      }
    }
    try {
      const headersWithAuth = {
        ...this.commonHeaders,
        authtoken: this.token
      };
      const response = await this.axiosInstance.post(`${this.baseURL}/ai/roleInfo/queryBotByNameV2`, {
        name: name,
        isNeedSaveSearchRecord: isNeedSaveSearchRecord,
        ...rest
      }, {
        headers: headersWithAuth
      });
      console.log("Hasil pencarian bot:", response.data);
      return response.data;
    } catch (error) {
      console.error("Gagal mencari bot:", error.message);
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
      error: "Missing required field: action",
      required: {
        action: "chat | search"
      }
    });
  }
  const joyland = new JoylandAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await joyland[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await joyland[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | search`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}