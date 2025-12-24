import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import CryptoJS from "crypto-js";
import apiConfig from "@/configs/apiConfig";
class JsonFetcher {
  constructor() {
    this.url = "https://cdnapp.giz.ai/static/model.json";
  }
  extract(s) {
    const data = [];
    let i = 0;
    while (i < s.length) {
      let start = -1;
      const vIdx = s.indexOf('{value:"', i);
      const mIdx = s.indexOf('{model:"', i);
      if (vIdx !== -1 && (mIdx === -1 || vIdx < mIdx)) {
        start = vIdx;
      } else if (mIdx !== -1) {
        start = mIdx;
      }
      if (start === -1) break;
      let end = -1;
      let bc = 0;
      for (let j = start; j < s.length; j++) {
        if (s[j] === "{") bc++;
        else if (s[j] === "}") {
          bc--;
          if (bc === 0) {
            end = j;
            break;
          }
        }
      }
      if (end === -1) {
        i = start + 1;
        continue;
      }
      const block = s.substring(start, end + 1);
      let id = "";
      const vKey = block.indexOf('value:"');
      const mKey = block.indexOf('model:"');
      if (vKey !== -1 && (mKey === -1 || vKey < mKey)) {
        const sq = vKey + 7;
        const eq = block.indexOf('"', sq);
        if (eq !== -1) id = block.substring(sq, eq);
      } else if (mKey !== -1) {
        const sq = mKey + 7;
        const eq = block.indexOf('"', sq);
        if (eq !== -1) id = block.substring(sq, eq);
      }
      const fields = [];
      const fIdx = block.indexOf("fields:[");
      if (fIdx !== -1) {
        let fEnd = -1;
        let brc = 0;
        for (let j = fIdx + 8; j < block.length; j++) {
          if (block[j] === "[") brc++;
          else if (block[j] === "]") {
            brc--;
            if (brc === -1) {
              fEnd = j;
              break;
            }
          }
        }
        if (fEnd !== -1) {
          const fContent = block.substring(fIdx + 8, fEnd);
          let fi = 0;
          while (fi < fContent.length) {
            const fStart = fContent.indexOf("{", fi);
            if (fStart === -1) break;
            let fBlockEnd = -1;
            let fbc = 0;
            for (let j = fStart; j < fContent.length; j++) {
              if (fContent[j] === "{") fbc++;
              else if (fContent[j] === "}") {
                fbc--;
                if (fbc === 0) {
                  fBlockEnd = j;
                  break;
                }
              }
            }
            if (fBlockEnd === -1) {
              fi = fStart + 1;
              continue;
            }
            const fBlock = fContent.substring(fStart, fBlockEnd + 1);
            let n = "",
              t = "";
            const nIdx = fBlock.indexOf('name:"');
            if (nIdx !== -1) {
              const sq = nIdx + 6;
              const eq = fBlock.indexOf('"', sq);
              if (eq !== -1) n = fBlock.substring(sq, eq);
            }
            const tIdx = fBlock.indexOf('type:"');
            if (tIdx !== -1) {
              const sq = tIdx + 6;
              const eq = fBlock.indexOf('"', sq);
              if (eq !== -1) t = fBlock.substring(sq, eq);
            }
            if (n && t) {
              const field = {
                name: n,
                type: t
              };
              if (t === "SelectField") {
                const opIdx = fBlock.indexOf("optionItems:[");
                if (opIdx !== -1) {
                  let opEnd = -1;
                  let opbc = 0;
                  for (let j = opIdx + 13; j < fBlock.length; j++) {
                    if (fBlock[j] === "[") opbc++;
                    else if (fBlock[j] === "]") {
                      opbc--;
                      if (opbc === -1) {
                        opEnd = j;
                        break;
                      }
                    }
                  }
                  if (opEnd !== -1) {
                    const opContent = fBlock.substring(opIdx + 13, opEnd);
                    const opts = [];
                    let opi = 0;
                    while (opi < opContent.length) {
                      const objStart = opContent.indexOf("{", opi);
                      if (objStart !== -1) {
                        let objbc = 0;
                        let objEnd = -1;
                        for (let j = objStart; j < opContent.length; j++) {
                          if (opContent[j] === "{") objbc++;
                          else if (opContent[j] === "}") {
                            objbc--;
                            if (objbc === 0) {
                              objEnd = j;
                              break;
                            }
                          }
                        }
                        if (objEnd !== -1) {
                          const objStr = opContent.substring(objStart, objEnd + 1);
                          let val = "",
                            lbl = "";
                          const vIdx = objStr.indexOf('value:"');
                          if (vIdx !== -1) {
                            const sq = vIdx + 7;
                            const eq = objStr.indexOf('"', sq);
                            if (eq !== -1) val = objStr.substring(sq, eq);
                          }
                          const lIdx = objStr.indexOf('label:"');
                          if (lIdx !== -1) {
                            const sq = lIdx + 7;
                            const eq = objStr.indexOf('"', sq);
                            if (eq !== -1) lbl = objStr.substring(sq, eq);
                          }
                          opts.push({
                            value: val,
                            label: lbl
                          });
                          opi = objEnd + 1;
                          if (opContent[opi] === ",") opi++;
                          continue;
                        }
                      }
                      const qStart = opContent.indexOf('"', opi);
                      const comma = opContent.indexOf(",", opi);
                      const endContent = opContent.length;
                      if (qStart !== -1 && (comma === -1 || qStart < comma)) {
                        const iStart = qStart + 1;
                        const iEnd = opContent.indexOf('"', iStart);
                        if (iEnd !== -1) {
                          opts.push(opContent.substring(iStart, iEnd));
                          opi = iEnd + 1;
                        } else {
                          break;
                        }
                      } else {
                        const numEnd = comma !== -1 && comma < endContent ? comma : endContent;
                        const numStr = opContent.substring(opi, numEnd).trim();
                        if (numStr.length > 0) {
                          opts.push(parseFloat(numStr));
                        }
                        opi = numEnd;
                      }
                      if (opContent[opi] === ",") {
                        opi++;
                      } else if (opi < opContent.length && opContent[opi] !== "]" && opContent[opi] !== "}") {
                        opi++;
                      } else {
                        break;
                      }
                    }
                    field.optionItems = opts;
                  }
                }
              }
              fields.push(field);
            }
            fi = fBlockEnd + 1;
            if (fContent[fi] === ",") fi++;
          }
        }
      }
      const selectFields = fields.filter(f => f.type === "SelectField");
      if (id && selectFields.length > 0) {
        data.push({
          modelIdentifier: id,
          fieldsData: selectFields
        });
      }
      i = end + 1;
    }
    return data;
  }
  async fetch() {
    try {
      const res = await axios.get(this.url, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          origin: "https://app.giz.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      let str;
      if (typeof res.data === "string") {
        str = res.data;
      } else if (typeof res.data === "object" && res.data !== null) {
        str = JSON.stringify(res.data);
      } else {
        throw new Error("Respons API bukan string atau JSON yang valid.");
      }
      return this.extract(str);
    } catch (error) {
      throw new Error(`Gagal mengambil atau memproses data: ${error.message || error}`);
    }
  }
}
class Encryptor {
  constructor() {
    this.secret = apiConfig.PASSWORD;
    this.key = CryptoJS.SHA256(this.secret);
  }
  _encryptData(data) {
    const json = JSON.stringify(data);
    const wordArray = CryptoJS.enc.Utf8.parse(json);
    const encrypted = CryptoJS.AES.encrypt(wordArray, this.key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  }
  _decryptData(hex) {
    try {
      const ciphertext = CryptoJS.enc.Hex.parse(hex);
      const decrypted = CryptoJS.AES.decrypt({
        ciphertext: ciphertext
      }, this.key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      return result ? JSON.parse(result) : null;
    } catch (err) {
      console.error("Decryption error:", err.message);
      return null;
    }
  }
}
class GizAIApi {
  constructor() {
    this.baseMailApiUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.baseGizApiUrl = "https://app.giz.ai/api";
    this.cookieJar = new CookieJar();
    this.encClient = new Encryptor();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        origin: "https://app.giz.ai",
        "X-Forwarded-For": this._generateRandomIp(),
        "X-Client-IP": this._generateRandomIp(),
        "True-Client-IP": this._generateRandomIp(),
        "CF-Connecting-IP": this._generateRandomIp(),
        "X-Real-IP": this._generateRandomIp(),
        Referer: "https://www.google.com/",
        DNT: "1",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive"
      },
      withCredentials: true
    }));
    this.accessToken = null;
    this.refreshToken = null;
    this.defaultPassword = this._generateRandomString(16);
    this.defaultDisplayName = "User" + this._generateRandomString(8);
    const initialCookies = `abVariant=6; initialInfo=%7B%22referrer%22%3A%22direct%22%2C%22date%22%3A%222025-07-13T17%3A06%3A24.726Z%22%2C%22userAgent%22%3A%22Mozilla%2F5.0%20(Linux%3B%20Android%2010%3B%20K)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F135.0.0.0%20Mobile%20Safari%2F537.36%22%2C%22initialURL%22%3A%22https%3A%2F%2Fwww.giz.ai%2Fai-video-generator%2F%22%2C%22browserLanguage%22%3A%22id-ID%22%2C%22downlink%22%3A0.15%7D; pfb9=67e0eaec73c0f7265; _sharedID=21417ee8-c0c8-45cd-bd46-a858f5720957; _sharedID_cst=2SzgLJUseQ%3D%3D; _ga=GA1.1.34196049.1752426391; _gcl_au=1.1.1947219890.1752426391; _pk_id.1.2e21=46d64e7ca91c0ae4.1752426391.; _pk_ses.1.2e21=1; _ga_7KCQ8VVKVL=GS2.1.s1752426390$o1$g0$t1752426394$j56$l0$h0;`;
    initialCookies.split(";").forEach(cookiePair => {
      const [key, value] = cookiePair.split("=").map(s => s.trim());
      if (key && value) {
        this.cookieJar.setCookieSync(`${key}=${value}`, "https://app.giz.ai/");
      }
    });
  }
  _generateRandomIp() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 256)).join(".");
  }
  _generateRandomString(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  _encryptData(data) {
    return this.encClient._encryptData(data);
  }
  _decryptData(encryptedText) {
    return this.encClient._decryptData(encryptedText);
  }
  async _axiosRequest(url, options = {}) {
    try {
      const headers = {
        ...options.headers
      };
      if (this.accessToken) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
      }
      const response = await this.axiosInstance({
        url: url,
        method: options.method || "GET",
        headers: headers,
        data: options.body,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error(`API call to ${url} failed:`, error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async _createEmail() {
    try {
      console.log("Membuat email sementara...");
      const response = await this._axiosRequest(`${this.baseMailApiUrl}?action=create`, {
        headers: {
          origin: `https://${apiConfig.DOMAIN_URL}`
        }
      });
      console.log("Email sementara berhasil dibuat:", response.email);
      return response.email;
    } catch (error) {
      throw new Error(`Gagal membuat email sementara: ${error.message}`);
    }
  }
  async _getMessage(email) {
    try {
      console.log(`Mengambil pesan untuk email: ${email}...`);
      const response = await this._axiosRequest(`${this.baseMailApiUrl}?action=message&email=${email}`, {
        headers: {
          origin: `https://${apiConfig.DOMAIN_URL}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil pesan untuk email ${email}: ${error.message}`);
    }
  }
  async _checkExistingUser(email) {
    try {
      console.log(`Memeriksa apakah pengguna ${email} sudah ada...`);
      const response = await this._axiosRequest(`${this.baseGizApiUrl}/isExistingUser`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify([email, "email"])
      });
      console.log(`Status pengguna ${email} sudah ada:`, response);
      return response;
    } catch (error) {
      throw new Error(`Gagal memeriksa pengguna ${email}: ${error.message}`);
    }
  }
  async _sendVerificationCode(email) {
    try {
      console.log(`Mengirim kode verifikasi ke ${email}...`);
      const response = await this._axiosRequest(`${this.baseGizApiUrl}/sendVerificationCode`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify([email, "email"])
      });
      console.log(`Respons pengiriman kode verifikasi:`, response);
      return response;
    } catch (error) {
      throw new Error(`Gagal mengirim kode verifikasi ke ${email}: ${error.message}`);
    }
  }
  async _checkVerificationCode(code) {
    try {
      console.log(`Memeriksa kode verifikasi: ${code}...`);
      this.cookieJar.setCookieSync(`verificationCode=${encodeURIComponent(`$2a$10$.BfYw7J5GcQUMF4S6b1byeSJOcoPNXKxTWxvdqO/FEKHNS0S7ob/P.`)}`, "https://app.giz.ai/");
      const response = await this._axiosRequest(`${this.baseGizApiUrl}/checkVerificationCode?code=${code}`);
      console.log(`Kode verifikasi ${code} valid:`, response);
      return response;
    } catch (error) {
      throw new Error(`Gagal memeriksa kode verifikasi ${code}: ${error.message}`);
    }
  }
  async _signUp(email, password, displayName, verificationCode) {
    try {
      console.log(`Mendaftarkan pengguna baru: ${email}...`);
      const payload = [{
        p: "",
        $computed: true,
        email: email,
        codeSent: true,
        emailSentTo: email,
        verificationCode: verificationCode,
        password: password,
        confirmPassword: password,
        displayName: displayName,
        verificationCodeValidated: true
      }];
      const response = await this.axiosInstance.post(`${this.baseGizApiUrl}/signUp`, JSON.stringify(payload), {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log(`Pengguna ${email} berhasil didaftarkan. Respons:`, response.data);
      const cookies = await this.cookieJar.getCookies("https://app.giz.ai/");
      const accessTokenCookie = cookies.find(c => c.key === "accessToken");
      if (accessTokenCookie) {
        this.accessToken = accessTokenCookie.value;
        console.log("Access Token diambil dari cookie dan disimpan.");
      } else {
        console.warn("Access Token cookie tidak ditemukan setelah pendaftaran.");
      }
      const refreshTokenCookie = cookies.find(c => c.key === "refreshToken");
      if (refreshTokenCookie) {
        this.refreshToken = refreshTokenCookie.value;
        console.log("Refresh Token diambil dari cookie dan disimpan.");
      } else {
        console.warn("Refresh Token cookie tidak ditemukan setelah pendaftaran.");
      }
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mendaftarkan pengguna baru ${email}: ${error.message}`);
    }
  }
  async _refreshUser() {
    try {
      console.log("Menyegarkan data pengguna...");
      const response = await this._axiosRequest(`${this.baseGizApiUrl}/user?refresh=true`);
      console.log("Data pengguna berhasil diperbarui:", response);
      return response;
    } catch (error) {
      throw new Error(`Gagal menyegarkan data pengguna: ${error.message}`);
    }
  }
  async _createAssistantSession() {
    try {
      console.log("Membuat sesi asisten baru...");
      const payload = {
        mode: "video-generation",
        shared: false
      };
      const response = await this._axiosRequest(`${this.baseGizApiUrl}/data/assistantSessions`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify(payload)
      });
      console.log("Sesi asisten berhasil dibuat:", response[0]);
      return response[0];
    } catch (error) {
      throw new Error(`Gagal membuat sesi asisten: ${error.message}`);
    }
  }
  async _infer(prompt, sessionId, modelType = "video-generation", baseModel = "hailuo", t2vModel = "t2v-01") {
    try {
      console.log(`Memulai inferensi video untuk prompt: "${prompt}" dengan sesi: ${sessionId}...`);
      const payload = {
        model: modelType,
        baseModel: baseModel,
        input: {
          settings: {
            character: "AI",
            responseMode: "text",
            voice: "tts-1:onyx",
            ttsSpeed: "1",
            imageModel: "sdxl"
          },
          baseModel: baseModel,
          prompt: prompt,
          model: t2vModel,
          expand_prompt: true,
          mode: modelType,
          sessionId: sessionId
        },
        subscribeId: "Hmtb3gR7FnGAlfIwpKCik",
        instanceId: "vS17geX_Fe2hS9z481fo-"
      };
      const response = await this._axiosRequest(`${this.baseGizApiUrl}/data/users/inferenceServer.infer`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify(payload)
      });
      console.log("Inferensi video dimulai. Task ID:", response.output.taskId);
      return {
        taskId: response.output.taskId
      };
    } catch (error) {
      throw new Error(`Gagal memulai inferensi video untuk prompt "${prompt}": ${error.message}`);
    }
  }
  async _getTaskResult(taskId, model = "hailuo") {
    try {
      console.log(`Mengambil hasil tugas untuk Task ID: ${taskId}...`);
      const payload = {
        model: model,
        taskId: taskId
      };
      const response = await this._axiosRequest(`${this.baseGizApiUrl}/data/users/inferenceServer.getTaskResult`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify(payload)
      });
      console.log(`Hasil tugas ${taskId}: Status: ${response.status}`);
      return response;
    } catch (error) {
      throw new Error(`Gagal mengambil hasil tugas untuk Task ID ${taskId}: ${error.message}`);
    }
  }
  async models() {
    try {
      console.log("[Proses] Mengambil daftar model yang tersedia...");
      const fetcher = new JsonFetcher();
      const result = await fetcher.fetch();
      console.log("[Proses] Berhasil mengambil daftar model");
      return result;
    } catch (error) {
      console.error("[ERROR] Gagal mengambil daftar model:", error.message);
      throw error;
    }
  }
  async create({
    prompt,
    type = "video-generation",
    base = "hailuo",
    model = "t2v-01"
  }) {
    if (!prompt) {
      throw new Error("Prompt is required for creation.");
    }
    const password = this.defaultPassword;
    const displayName = this.defaultDisplayName;
    try {
      console.log("Memulai alur kerja pembuatan video...");
      const email = await this._createEmail();
      await this._checkExistingUser(email);
      await this._sendVerificationCode(email);
      let verificationCode = null;
      let emailAttempts = 0;
      const maxEmailPollAttempts = 20;
      const emailPollInterval = 5e3;
      console.log("Memulai polling untuk kode verifikasi...");
      while (!verificationCode && emailAttempts < maxEmailPollAttempts) {
        console.log(`Percobaan ${emailAttempts + 1}/${maxEmailPollAttempts} untuk mendapatkan kode verifikasi.`);
        const messages = await this._getMessage(email);
        for (const msg of messages) {
          const match = msg.text_content.match(/Verification Code: ([a-zA-Z0-9_]+)/);
          if (match && match[1]) {
            verificationCode = match[1];
            console.log("Kode verifikasi ditemukan:", verificationCode);
            break;
          }
        }
        if (!verificationCode) {
          await new Promise(resolve => setTimeout(resolve, emailPollInterval));
          emailAttempts++;
        }
      }
      if (!verificationCode) {
        throw new Error("Gagal mengambil kode verifikasi dari email setelah beberapa percobaan.");
      }
      await this._checkVerificationCode(verificationCode);
      const signUpResponse = await this._signUp(email, password, displayName, verificationCode);
      if (!signUpResponse.id) {
        throw new Error("Pendaftaran gagal: ID Pengguna tidak diterima.");
      }
      await this._refreshUser();
      const sessionId = await this._createAssistantSession();
      const {
        taskId
      } = await this._infer(prompt, sessionId, type, base, model);
      const combinedData = {
        taskId: taskId,
        token: this.accessToken,
        model: base
      };
      const encryptedTaskId = this._encryptData(combinedData);
      console.log("Pembuatan video dimulai. Anda dapat memeriksa statusnya menggunakan ID terenkripsi ini.");
      return {
        task_id: encryptedTaskId
      };
    } catch (error) {
      console.error("Terjadi kesalahan fatal selama proses pembuatan video.");
      throw error;
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) {
      throw new Error("Encrypted task_id is required to check status.");
    }
    try {
      const decryptedData = this._decryptData(task_id);
      const {
        taskId,
        token,
        model
      } = decryptedData;
      this.accessToken = token;
      console.log(`Memeriksa status tugas dengan ID: ${taskId} dan Token: ${token}...`);
      const response = await this._getTaskResult(taskId, model);
      return response;
    } catch (error) {
      throw new Error(`Gagal mendekripsi atau memeriksa status tugas: ${error.message}`);
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
        action: "models | create | status"
      }
    });
  }
  const gizApi = new GizAIApi();
  try {
    let result;
    switch (action) {
      case "models":
        result = await gizApi[action]();
        break;
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${params.action})`
          });
        }
        result = await gizApi[action](params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id (required for ${action})`
          });
        }
        result = await gizApi[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: models | create | status`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}