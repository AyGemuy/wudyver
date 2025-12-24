import axios from "axios";
import Encoder from "@/lib/encoder";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import FormData from "form-data";
class AIMusicGenerator {
  constructor() {
    this.base_url = "https://ai-music-generator.ai";
    this.temp_mail_api = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.auth_token = null;
    this.user_id = null;
    this.user_agent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.cookies = new Set();
    this.axiosInstance = axios.create({
      baseURL: this.base_url,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": this.user_agent,
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        origin: this.base_url,
        priority: "u=1, i",
        ...SpoofHead()
      },
      maxRedirects: 20
    });
    this.axiosInstance.interceptors.request.use(config => {
      if (this.cookies.size > 0) {
        config.headers.Cookie = Array.from(this.cookies).join("; ");
      }
      return config;
    });
    this.axiosInstance.interceptors.response.use(response => {
      const new_cookies = response.headers["set-cookie"];
      if (new_cookies) {
        new_cookies.forEach(cookieString => {
          const newCookie = cookieString.split(";")[0];
          this.cookies.add(newCookie);
        });
      }
      console.log("✅ Cookie diperbarui. Cookie saat ini:", Array.from(this.cookies).join("; "));
      return response;
    });
  }
  async create_temp_email() {
    console.log("Membuat email sementara...");
    try {
      const {
        data
      } = await axios.get(`${this.temp_mail_api}?action=create`);
      console.log("Email sementara berhasil dibuat:", data.email);
      return data.email;
    } catch (error) {
      console.error("ERROR: Pembuatan email sementara gagal.");
      throw new Error(`Temp email failed: ${error.message}`);
    }
  }
  async check_email_for_links(email) {
    console.log(`Memeriksa email "${email}" untuk tautan verifikasi dan password...`);
    try {
      const {
        data
      } = await axios.get(`${this.temp_mail_api}?action=message&email=${email}`);
      const textContent = data.data?.[0]?.text_content;
      if (!textContent) {
        return {
          verifyLink: null,
          passwordLink: null
        };
      }
      let verifyLink = null;
      let passwordLink = null;
      const verifyStart = textContent.indexOf("(https://track.pstmrk.it");
      if (verifyStart !== -1) {
        const verifyEnd = textContent.indexOf(")", verifyStart);
        if (verifyEnd !== -1) {
          verifyLink = textContent.substring(verifyStart + 1, verifyEnd);
          console.log("✅ Tautan verifikasi ditemukan:", verifyLink);
        }
      }
      const passwordStart = textContent.indexOf("(https://track.pstmrk.it/3s/ai-music-generator.ai%2F%3Fref%3Demail_password");
      if (passwordStart !== -1) {
        const passwordEnd = textContent.indexOf(")", passwordStart);
        if (passwordEnd !== -1) {
          passwordLink = textContent.substring(passwordStart + 1, passwordEnd);
          console.log("✅ Tautan password ditemukan:", passwordLink);
        }
      }
      if (!verifyLink) {
        console.log("❌ Tautan verifikasi tidak ditemukan.");
      }
      if (!passwordLink) {
        console.log("❌ Tautan password tidak ditemukan.");
      }
      return {
        verifyLink: verifyLink,
        passwordLink: passwordLink
      };
    } catch (error) {
      console.error("ERROR: Pemeriksaan email gagal.");
      throw new Error(`Email check failed: ${error.message}`);
    }
  }
  async _initiate_and_request_links(email) {
    console.log(`Menginisialisasi proses masuk untuk email: ${email}`);
    try {
      const form = new FormData();
      form.append("1_email", email);
      form.append("0", '["$K1"]');
      await this.axiosInstance.post("/id/sign-in", form, {
        headers: {
          accept: "text/x-component",
          ...form.getHeaders(),
          "next-action": "48799e791ff432bebd5c32793c209deeb2707b09",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22id%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22sign-in%22%2C%7B%22children%22%3A%5B%22__PAGE__%3F%7B%5C%22locale%5C%22%3A%5C%22id%5C%22%7D%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D"
        }
      });
      console.log("Permintaan POST inisialisasi masuk berhasil.");
      await this.axiosInstance.get(`/id/sign-in?status=Success%21&status_description=Please+check+your+email+for+a+one+time+code&disable_button=true&email=${encodeURIComponent(email)}&opt_send=true`);
      await this.axiosInstance.get(`/id/sign-in?disable_button=true&email=${encodeURIComponent(email)}&opt_send=true&_rsc=1kaj1`);
      console.log("✅ Permintaan OTP berhasil dikirim. Menunggu email...");
    } catch (error) {
      console.error("ERROR: Gagal menginisialisasi proses masuk.");
      throw new Error(`Sign-in initialization failed: ${error.message}`);
    }
  }
  async _login_with_pkce_flow(verifyLink) {
    console.log("Memulai proses login dengan alur Supabase PKCE...");
    const SUPABASE_TOKEN_URL = "https://omascerqilrwprtqhkjd.supabase.co/auth/v1/token?grant_type=pkce";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYXNjZXJxaWxyd3BydHFoa2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMxNTA5MDYsImV4cCI6MjAyODcyNjkwNn0.34JMbHA1i7Vu2m3AM5agQdMQE9_yEAmIJmD-TdVx2uc";
    try {
      console.log("Langkah 1: Mengunjungi tautan verifikasi dan mengikuti semua pengalihan...");
      const response = await this.axiosInstance.get(verifyLink);
      const finalRedirectUrl = response.request.res.responseUrl;
      console.log("✅ Pengalihan selesai. URL terakhir adalah:", finalRedirectUrl);
      const url = new URL(finalRedirectUrl);
      const params = new URLSearchParams(url.search);
      const authCode = params.get("code");
      if (!authCode) {
        throw new Error("Gagal mengekstrak auth_code dari URL pengalihan akhir.");
      }
      console.log("✅ Auth Code berhasil diekstrak.");
      const cookieString = Array.from(this.cookies).join("; ");
      const verifier_match = cookieString.match(/sb-omascerqilrwprtqhkjd-auth-token-code-verifier=([^;]+)/);
      if (!verifier_match) {
        throw new Error("Gagal mengekstrak code_verifier dari cookie.");
      }
      const codeVerifier = JSON.parse(decodeURIComponent(verifier_match[1]));
      console.log("✅ Code Verifier berhasil diekstrak dari cookie.");
      console.log("Langkah 3: Mengirim permintaan POST untuk menukar kode dengan token...");
      const payload = {
        auth_code: authCode,
        code_verifier: codeVerifier
      };
      console.log("Mengirim payload POST:", JSON.stringify(payload, null, 2));
      const tokenResponse = await axios.post(SUPABASE_TOKEN_URL, payload, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "content-type": "application/json;charset=UTF-8",
          origin: this.base_url,
          "user-agent": this.user_agent,
          "x-client-info": "supabase-ssr/0.1.0",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      const token_data = tokenResponse.data;
      console.log("-----------------------------------");
      console.log("✅ Berhasil mendapatkan data token dari API token Supabase:");
      console.log(JSON.stringify(token_data, null, 2));
      console.log("-----------------------------------");
      this.auth_token = token_data.access_token;
      this.user_id = token_data.user.id;
      console.log("✅ Token dan User ID berhasil diekstrak dari respons API.");
      console.log("User ID:", this.user_id);
    } catch (error) {
      console.error("ERROR: Gagal login dengan alur PKCE.");
      throw new Error(`PKCE login failed: ${error.message}`);
    }
  }
  async generate_music(params) {
    console.log("Memeriksa autentikasi sebelum menghasilkan musik...");
    const song_ids = [this._generate_uuid(), this._generate_uuid()];
    const payload = {
      style: params.style || "electronic",
      prompt: params.lyrics || `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
      title: params.title || "AI Test Track",
      model: params.model || "V4_5",
      instrumental: params.instrumental || false,
      customMode: params.customMode || false,
      callBackUrl: `userId=${this.user_id}&songId1=${song_ids[0]}&songId2=${song_ids[1]}`
    };
    console.log("Mengirim permintaan untuk menghasilkan musik dengan payload:", JSON.stringify(payload, null, 2));
    try {
      const response = await this.axiosInstance.post("/api/generate", payload, {
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${this.auth_token}`
        }
      });
      console.log("✅ Permintaan pembuatan musik berhasil. Respon data:", JSON.stringify(response.data, null, 2));
      return {
        success: true,
        song_ids: song_ids,
        data: response.data
      };
    } catch (error) {
      console.error("ERROR: Gagal menghasilkan musik.");
      throw new Error(`Music generation failed: ${error.message}`);
    }
  }
  async status({
    task_id: taskId
  }) {
    console.log(`Memeriksa status dengan mengunjungi halaman profil...`);
    if (!taskId) {
      throw new Error("task_id is required to check status.");
    }
    const decryptedData = await this.dec(taskId);
    const {
      user_id,
      auth_token,
      data,
      cookie
    } = decryptedData;
    if (!user_id || !auth_token) {
      throw new Error("Invalid task_id: Missing required data after decryption.");
    }
    this.auth_token = auth_token;
    this.user_id = user_id;
    this.cookies = new Set();
    if (Array.isArray(cookie)) {
      cookie.forEach(c => this.cookies.add(c));
    } else if (typeof cookie === "string") {
      const cookieArray = cookie.split("; ");
      cookieArray.forEach(c => this.cookies.add(c));
    }
    const userIdWithoutHyphens = user_id.replace(/-/g, "");
    try {
      const payload = JSON.stringify([user_id, 1, 999]);
      const response = await this.axiosInstance.post(`/id/@${userIdWithoutHyphens}`, payload, {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "03ffe4fcafdbbe00f6db9ae42639530192acd4b7",
          "next-router-state-tree": `%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22id%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%5B%22userId%22%2C%22%2540${userIdWithoutHyphens}%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%3F%7B%5C%22locale%5C%22%3A%5C%22id%5C%22%2C%5C%22userId%5C%22%3A%5C%22%40${userIdWithoutHyphens}%5C%22%7D%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D`
        }
      });
      return {
        ...this.parseAlbums(response.data),
        ...data
      };
    } catch (error) {
      console.error("ERROR: Gagal memeriksa status.");
      throw new Error(`Status check failed: ${error.message}`);
    }
  }
  async create(params) {
    console.log("Memulai proses auto-generate...");
    try {
      const email = await this.create_temp_email();
      await this._initiate_and_request_links(email);
      await new Promise(resolve => setTimeout(resolve, 5e3));
      console.log("Menunggu 5 detik agar email verifikasi tiba.");
      let links;
      for (let i = 0; i < 5; i++) {
        links = await this.check_email_for_links(email);
        if (links.verifyLink) break;
        console.log(`Percobaan ke-${i + 1} gagal. Menunggu 10 detik lagi...`);
        await new Promise(resolve => setTimeout(resolve, 1e4));
      }
      if (!links.verifyLink) {
        console.error("ERROR: Tautan verifikasi tidak diterima setelah beberapa kali percobaan.");
        throw new Error("Verification link not received");
      }
      await this._login_with_pkce_flow(links.verifyLink);
      console.log("✅ Login otomatis berhasil.");
      const task_id = await this.enc({
        user_id: this.user_id,
        auth_token: this.auth_token,
        data: await this.generate_music(params),
        cookie: Array.from(this.cookies)
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("-----------------------------------");
      console.error("Kesalahan fatal:", error.message);
      console.error("-----------------------------------");
      throw new Error(`Auto-generation process failed: ${error.message}`);
    }
  }
  parseAlbums(data) {
    const lines = data.split("\n");
    let albumsData = null;
    for (const line of lines) {
      if (line.includes('"albums":')) {
        const jsonString = line.substring(line.indexOf("{"));
        try {
          const parsedJson = JSON.parse(jsonString);
          if (parsedJson && parsedJson.albums) {
            return parsedJson;
          }
        } catch (e) {
          console.error("Failed to parse JSON:", e);
        }
      }
    }
    return albumsData;
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
  _generate_uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (create or status) is required."
    });
  }
  const generator = new AIMusicGenerator();
  try {
    switch (action) {
      case "create":
        if (!params.lyrics) {
          return res.status(400).json({
            error: "lyrics is required for 'create' action."
          });
        }
        const createResponse = await generator.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await generator.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}