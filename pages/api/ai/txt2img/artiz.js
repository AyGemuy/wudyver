import axios from "axios";
import crypto from "crypto";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class ArtizGenerator {
  constructor() {
    const cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: cookieJar,
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        Origin: "https://www.artiz.ai",
        Referer: "https://www.artiz.ai/image-generation/free",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      }
    }));
  }
  _generateCredentials() {
    const randomString = crypto.randomBytes(6).toString("hex");
    const name = `user_${randomString}`;
    const password = `${crypto.randomBytes(8).toString("base64")}A1!`;
    return {
      name: name,
      password: password
    };
  }
  async _createTempEmail() {
    try {
      console.log("📬 Membuat email sementara...");
      const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      console.log(`✅ Email berhasil dibuat: ${response.data.email}`);
      return response.data.email;
    } catch (error) {
      console.error("❌ Gagal di _createTempEmail:", error.message);
      throw error;
    }
  }
  async _registerAccount(email, name, password) {
    try {
      console.log(`📝 Mencoba mendaftar dengan email: ${email}`);
      const data = new URLSearchParams({
        name: name,
        email: email,
        password: password,
        confirmPassword: password
      });
      const response = await this.client.post("https://www.artiz.ai/api/auth/register", data);
      if (response.data.status !== 200) {
        const apiError = new Error(response.data.msg || "Pendaftaran gagal");
        apiError.code = response.data.code;
        throw apiError;
      }
      console.log("✅ Pendaftaran berhasil, menunggu email verifikasi.");
    } catch (error) {
      console.error("❌ Gagal di _registerAccount:", error.message);
      throw error;
    }
  }
  async _getVerificationLink(email) {
    console.log("⏳ Mencari link verifikasi...");
    let retries = 0;
    const maxRetries = 60;
    while (true) {
      if (retries >= maxRetries) throw new Error("Timeout: Gagal mendapatkan link verifikasi setelah 3 menit.");
      try {
        const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const message = response.data.data?.[0];
        if (message) {
          const match = message.html_content.match(/href='(https:\/\/www\.artiz\.ai\/api\/auth\/activate[^']*)'/);
          if (match && match[1]) {
            console.log("🔗 Link verifikasi ditemukan!");
            return match[1];
          }
        }
      } catch (error) {
        console.warn(`⚠️ Gagal pada percobaan polling email: ${error.message}.`);
      }
      retries++;
      await sleep(3e3);
    }
  }
  async _activateAccount(verificationLink) {
    try {
      console.log("🚀 Mengaktifkan akun...");
      await this.client.get(verificationLink);
      console.log("✅ Akun berhasil diaktifkan.");
    } catch (error) {
      console.error("❌ Gagal di _activateAccount:", error.message);
      throw error;
    }
  }
  async _login(email, password) {
    try {
      console.log("🔒 Melakukan login...");
      const data = new URLSearchParams({
        email: email,
        password: password
      });
      const response = await this.client.post("https://www.artiz.ai/api/auth/login", data);
      if (response.data.code !== "login.success") throw new Error(`Login gagal: ${response.data.msg}`);
      console.log(`✅ Login berhasil sebagai: ${response.data.user.nickname}`);
    } catch (error) {
      console.error("❌ Gagal di _login:", error.message);
      throw error;
    }
  }
  async _createImageTask(params) {
    try {
      console.log("🎨 Mengirim permintaan gambar...");
      const data = new URLSearchParams(params);
      const response = await this.client.post("https://www.artiz.ai/api/ai/doCreate", data);
      if (response.data.code !== "generate.success") throw new Error(`Gagal memulai gambar: ${response.data.msg}`);
      console.log(`✅ Tugas gambar dimulai. UUID: ${response.data.uuid}`);
      return response.data.uuid;
    } catch (error) {
      console.error("❌ Gagal di _createImageTask:", error.message);
      throw error;
    }
  }
  async _getFinalImage(uuid) {
    console.log("🖼️ Menunggu hasil gambar (polling status & riwayat)...");
    let retries = 0;
    const maxRetries = 60;
    while (true) {
      if (retries >= maxRetries) {
        throw new Error("Timeout: Gagal mengambil gambar setelah 3 menit.");
      }
      try {
        const statusResponse = await this.client.get(`https://www.artiz.ai/api/ai/getImgStatus?uuid=${uuid}`);
        if (statusResponse.data.code === "getImgStatus.success") {
          const historyResponse = await this.client.get(`https://www.artiz.ai/api/ai/gethistorylist?page=1&aitype=free&uuid=${uuid}`);
          const historyItem = historyResponse.data?.list?.find(item => item.uuid === uuid);
          if (historyItem) {
            console.log("🎉 Gambar ditemukan di riwayat!");
            const baseUrl = "https://img.artiz.ai/ai/";
            historyItem.imglist = historyItem.imglist.map(img => ({
              ...img,
              full_url: `${baseUrl}${img.img}`
            }));
            return historyItem;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Gagal pada percobaan polling: ${error.message}. Mencoba lagi...`);
      }
      retries++;
      await sleep(3e3);
    }
  }
  async generate(options) {
    const defaultCurlParams = {
      size: "960x1280",
      model: "10541",
      type: "free",
      style: "0",
      lora: "",
      loraSth: "0.8",
      img2img: "",
      denoise: "1",
      edge2img: "",
      edgeSth: "0",
      depth2img: "",
      depthSth: "0",
      pose2img: "",
      poseSth: "0",
      ref2img: "",
      refSth: "0.58",
      face2img: "",
      faceSth: "0",
      imgNum: "2",
      seed: "-1",
      negativePrompt: "",
      isPublic: "0",
      fixFace: "0"
    };
    const finalImageParams = {
      ...defaultCurlParams,
      ...options
    };
    if (!finalImageParams.prompt) throw new Error("Paramenter `prompt` wajib diisi.");
    while (true) {
      try {
        const {
          name,
          password
        } = this._generateCredentials();
        console.log(`🔑 Kredensial Acak Dibuat -> Nama: ${name}`);
        const email = await this._createTempEmail();
        await this._registerAccount(email, name, password);
        const verificationLink = await this._getVerificationLink(email);
        await this._activateAccount(verificationLink);
        await this._login(email, password);
        const uuid = await this._createImageTask(finalImageParams);
        return await this._getFinalImage(uuid);
      } catch (error) {
        if (error.code === "register.email.exist") {
          console.warn(`⚠️ ${error.message}. Mencoba lagi dengan email & kredensial baru...`);
          await sleep(2e3);
          continue;
        } else {
          console.error(`❌ Terjadi kesalahan fatal dalam alur utama: ${error.message}`);
          throw error;
        }
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const artiz = new ArtizGenerator();
    const response = await artiz.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}