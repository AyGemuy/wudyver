import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import CryptoJS from "crypto-js";
import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class Img2Vid {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH
W5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr
rnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s
snOjvdDb4wiZI8x3UwIDAQAB
-----END PUBLIC KEY-----`;
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://imagetovideoai.io",
      priority: "u=1, i",
      referer: "https://imagetovideoai.io/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  getAuthParams(uid) {
    try {
      const appId = "ai_imgtovideo",
        apiKey = "NHGNy5YFz7HeFb",
        timestamp = Math.floor(Date.now() / 1e3),
        nonce = uuidv4();
      const randomAesKey = Array.from({
        length: 16
      }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 62))).join("");
      const secretKey = crypto.publicEncrypt({
        key: this.publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(randomAesKey)).toString("base64");
      const dataToSign = `${appId}:${apiKey}:${timestamp}:${nonce}:${secretKey}`;
      const key = CryptoJS.enc.Utf8.parse(randomAesKey);
      const sign = CryptoJS.AES.encrypt(dataToSign, key, {
        iv: key,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
      return {
        app_id: appId,
        t: timestamp,
        nonce: nonce,
        sign: sign,
        secret_key: secretKey,
        uid: uid
      };
    } catch (error) {
      console.error("[ERROR] Gagal membuat parameter otentikasi:", error.message);
      throw error;
    }
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async getMail() {
    console.log("[PROSES] 1. Mendapatkan email sementara...");
    try {
      const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v13?action=create`);
      const email = response.data?.data?.address;
      if (!email) throw new Error("API email tidak mengembalikan alamat email.");
      console.log(`[SUKSES] Email dibuat: ${email}`);
      return email;
    } catch (error) {
      console.error("[GAGAL] Tidak dapat membuat email sementara:", error.message);
      throw error;
    }
  }
  async register(email, password) {
    console.log(`[PROSES] 2. Mendaftarkan akun dengan email ${email}...`);
    try {
      const response = await this.client.post("https://api.imagetovideoai.io/api/user/api/register", {
        email: email,
        password: password
      }, {
        headers: {
          ...this.baseHeaders,
          "content-type": "application/json"
        }
      });
      console.log("[LOG] Respon Pendaftaran:", response.data);
      if (response.data.code !== 200 && response.data.code !== "200") throw new Error(response.data.msg || "Respons tidak sukses");
      console.log("[SUKSES] Permintaan pendaftaran terkirim.");
    } catch (error) {
      const errorMsg = error.response?.data?.msg || error.message;
      console.error(`[GAGAL] Pendaftaran gagal: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }
  async verify(email) {
    console.log("[PROSES] 3. Memeriksa email verifikasi (maksimal 2 menit)...");
    for (let i = 0; i < 60; i++) {
      await this.delay(3e3);
      console.log(`   -> Pengecekan ke-${i + 1}...`);
      try {
        const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v13`, {
          params: {
            action: "message",
            email: email
          }
        });
        const messageHtml = response.data?.data?.rows?.[0]?.html;
        if (messageHtml) {
          console.log("[SUKSES] Email verifikasi ditemukan!");
          const match = messageHtml.match(/href="([^"]+)"/);
          if (match?.[1]) {
            console.log("[PROSES] 4. Mengikuti link verifikasi...");
            await this.client.get(match[1], {
              headers: this.baseHeaders
            });
            console.log(`[SUKSES] Verifikasi berhasil.`);
            return;
          }
        }
      } catch (error) {
        console.warn(`[WARN] Gagal memeriksa email pada percobaan ke-${i + 1}:`, error.message);
      }
    }
    throw new Error("Gagal menemukan email verifikasi dalam waktu 2 menit.");
  }
  async login(email, password) {
    console.log("[PROSES] 4.5 Melakukan login...");
    try {
      const response = await this.client.post("https://api.imagetovideoai.io/api/user/api/login", {
        email: email,
        password: password
      }, {
        headers: {
          ...this.baseHeaders,
          "content-type": "application/json"
        }
      });
      console.log("[LOG] Respon Login:", response.data);
      const token = response.data?.data?.token;
      if (!token) throw new Error(`Login gagal atau token tidak ditemukan.`);
      console.log("[SUKSES] Login berhasil, token didapatkan.");
      return token;
    } catch (error) {
      console.error("[GAGAL] Login gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  async claimAndCheckCredit({
    token,
    uid
  }) {
    console.log("[PROSES] 4.6 Mengklaim & Mengecek Kredit Harian...");
    try {
      const response = await this.client.get("https://api.imagetovideoai.io/api/user/v1/credit", {
        params: this.getAuthParams(uid),
        headers: {
          ...this.baseHeaders,
          authorization: `Bearer ${token}`
        }
      });
      console.log("[LOG] Respon Cek Kredit:", response.data);
      const creditData = response.data?.data;
      if (creditData?.rewardPoints !== undefined) {
        const rewardPoints = creditData.rewardPoints;
        console.log(`[INFO] Poin Hadiah (Kredit): ${rewardPoints}`);
        if (rewardPoints <= 0) {
          throw new Error("Poin hadiah tidak mencukupi (0). Proses dihentikan.");
        }
      } else {
        throw new Error("Gagal mendapatkan data 'rewardPoints' dari respons API kredit.");
      }
    } catch (error) {
      if (error.message.includes("Poin hadiah tidak mencukupi")) throw error;
      console.error("[GAGAL] Gagal mengecek kredit:", error.response?.data || error.message);
      throw new Error("Gagal melakukan pengecekan kredit.");
    }
  }
  async _initializeSession() {
    const maxRetries = 60;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n--- Memulai Sesi Otentikasi (Percobaan ${attempt}/${maxRetries}) ---`);
      const uid = uuidv4();
      try {
        const email = await this.getMail();
        const password = `Pass_${Date.now()}`;
        await this.register(email, password);
        await this.verify(email);
        const token = await this.login(email, password);
        await this.claimAndCheckCredit({
          token: token,
          uid: uid
        });
        return {
          token: token,
          uid: uid
        };
      } catch (error) {
        console.error(`\n[ERROR] Sesi Otentikasi percobaan ${attempt} gagal: ${error.message}`);
        if (error.message.includes("valid email") && attempt < maxRetries) {
          console.log("[INFO] Mencoba lagi dengan email baru...");
          await this.delay(3e3);
        } else {
          throw error;
        }
      }
    }
    throw new Error("Gagal melakukan otentikasi setelah beberapa kali percobaan.");
  }
  async img2vid({
    prompt,
    imageUrl,
    version = "v3",
    type = "pay",
    ...rest
  }) {
    try {
      const {
        token,
        uid
      } = await this._initializeSession();
      console.log("[PROSES] 5. Membuat tugas IMG2VID...");
      const payload = {
        promptImage: imageUrl,
        promptText: prompt,
        model: "basic",
        platform: "image",
        resolution: "720p",
        duration: rest.duration || 4,
        ratio: rest.ratio || "720:1280",
        ...rest
      };
      const response = await this.client.post(`https://api.imagetovideoai.io/api/${type}/${version}/task`, payload, {
        params: this.getAuthParams(uid),
        headers: {
          ...this.baseHeaders,
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        }
      });
      console.log("[LOG] Respon Pembuatan Tugas IMG2VID:", response.data);
      const taskData = response.data?.data;
      if (!taskData?.task_id) throw new Error(`Gagal membuat tugas. Respon: ${JSON.stringify(response.data)}`);
      console.log(`[SUKSES] Tugas IMG2VID berhasil dibuat.`);
      const encryptedData = {
        task_id: taskData.task_id,
        token: token,
        uid: uid,
        version: version,
        type: type
      };
      return await this.enc(encryptedData);
    } catch (error) {
      console.error(`\n[PROSES GAGAL] img2vid: ${error.message}`);
      return null;
    }
  }
  async txt2vid({
    prompt,
    version = "v2",
    type = "text",
    ...rest
  }) {
    try {
      const {
        token,
        uid
      } = await this._initializeSession();
      console.log("[PROSES] 5. Membuat tugas TXT2VID...");
      const payload = {
        prompt: prompt,
        duration: rest.duration || 4,
        aspect_ratio: rest.aspect_ratio || "9:16",
        movement_amplitude: rest.movement_amplitude || "auto",
        style: rest.style || "general",
        platform: "text2video",
        ...rest
      };
      const response = await this.client.post(`https://api.imagetovideoai.io/api/${type}/${version}/task`, payload, {
        params: this.getAuthParams(uid),
        headers: {
          ...this.baseHeaders,
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        }
      });
      console.log("[LOG] Respon Pembuatan Tugas TXT2VID:", response.data);
      const taskData = response.data?.data;
      if (!taskData?.task_id) throw new Error(`Gagal membuat tugas. Respon: ${JSON.stringify(response.data)}`);
      console.log(`[SUKSES] Tugas TXT2VID berhasil dibuat.`);
      const encryptedData = {
        task_id: taskData.task_id,
        token: token,
        uid: uid,
        version: version,
        type: type
      };
      return await this.enc(encryptedData);
    } catch (error) {
      console.error(`\n[PROSES GAGAL] txt2vid: ${error.message}`);
      return null;
    }
  }
  async status({
    task_id: _task_id
  }) {
    const decryptedData = await this.dec(_task_id);
    const {
      task_id,
      token,
      uid,
      version,
      type
    } = decryptedData;
    if (!task_id || !token || !uid) {
      console.error("[GAGAL] task_id, token, dan uid diperlukan untuk memeriksa status.");
      return null;
    }
    console.log(`[PROSES] Memeriksa status untuk Task ID: ${task_id}...`);
    try {
      const response = await this.client.get(`https://api.imagetovideoai.io/api/${type}/${version}/task`, {
        params: {
          task_id: task_id,
          ...this.getAuthParams(uid)
        },
        headers: {
          ...this.baseHeaders,
          authorization: `Bearer ${token}`
        }
      });
      console.log("[LOG] Respon Status:", response.data);
      const taskData = response.data?.data || response.data;
      if (taskData) {
        console.log(`[INFO] Status saat ini: ${taskData.status}`);
        return taskData;
      } else {
        throw new Error("Struktur data respons status tidak valid.");
      }
    } catch (error) {
      console.error("[GAGAL] Gagal memeriksa status:", error.response?.data || error.message);
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
      error: "Action is required."
    });
  }
  const client = new Img2Vid();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2vid."
          });
        }
        response = await client.img2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        response = await client.txt2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await client.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'txt2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}