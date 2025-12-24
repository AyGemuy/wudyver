import axios from "axios";
import Encoder from "@/lib/encoder";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class AiSongGenerator {
  constructor() {
    this.apiClient = axios.create({
      baseURL: "https://aisonggenerator.vercel.app/api",
      withCredentials: true,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: "https://aisonggenerator.vercel.app",
        Referer: "https://aisonggenerator.vercel.app/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.malikApiClient = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
    });
    this.supabaseClient = axios.create({
      baseURL: "https://hjgeamyjogwwmvjydbfm.supabase.co/auth/v1",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
        "x-supabase-api-version": "2024-01-01",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZ2VhbXlqb2d3d212anlkYmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzMTA3NjUsImV4cCI6MjAzNjg4Njc2NX0.u0fZNMPMuBjUfgaKvb26d1sadxPCrqyeJWhIn4u16mA",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZ2VhbXlqb2d3d212anlkYmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzMTA3NjUsImV4cCI6MjAzNjg4Njc2NX0.u0fZNMPMuBjUfgaKvb26d1sadxPCrqyeJWhIn4u16mA"
      }
    });
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
  async getTemporaryEmail() {
    try {
      console.log("🔗 [Proses]: Mengirim permintaan untuk mendapatkan email sementara...");
      const response = await this.malikApiClient.get("", {
        params: {
          action: "create"
        }
      });
      console.log("✅ [Respons]: Email sementara berhasil didapat.");
      console.log("📦 [Data Respons]:", response.data);
      return response.data.email;
    } catch (error) {
      console.error("❌ [Error]: Gagal mendapatkan email sementara.");
      console.error("🔍 [Detail Error]:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async sendOtp(email) {
    try {
      console.log(`🔗 [Proses]: Mengirim OTP ke email: ${email}...`);
      const payload = {
        email: email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: "m8Jhg5uzHW9nzfj1mwTuBD54wIk7rEQ7piN9XfaYlBU",
        code_challenge_method: "s256"
      };
      const response = await this.supabaseClient.post("/otp", payload);
      console.log("✅ [Respons]: OTP berhasil dikirim.");
      console.log("📦 [Data Respons]:", response.data);
    } catch (error) {
      console.error("❌ [Error]: Gagal mengirim OTP.");
      console.error("🔍 [Detail Error]:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async verifyCode(email, verificationCode) {
    try {
      console.log("🔗 [Proses]: Memverifikasi kode OTP...");
      const payload = {
        email: email,
        verificationCode: verificationCode
      };
      const response = await this.apiClient.post("/auth/verificationCode", payload, {
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        }
      });
      console.log("✅ [Respons]: Kode berhasil diverifikasi.");
      console.log("📦 [Data Respons]:", response.data);
      const cookies = response.headers["set-cookie"];
      if (!cookies) {
        throw new Error("Tidak ada cookie yang diterima. Verifikasi gagal.");
      }
      console.log("🍪 [Cookie Diterima]:", cookies);
      const authCookie = cookies.find(c => c.includes("sb-hjgeamyjogwwmvjydbfm-auth-token"));
      if (!authCookie) {
        throw new Error("Cookie otorisasi tidak ditemukan.");
      }
      const base64Token = authCookie.split("base64-")[1].split(";")[0];
      let tokenData;
      try {
        const tokenJson = Buffer.from(base64Token, "base64").toString("utf-8");
        tokenData = JSON.parse(tokenJson);
      } catch (decodeError) {
        throw new Error(`Gagal mendekode atau parse JSON dari cookie: ${decodeError.message}`);
      }
      if (!tokenData || !tokenData.access_token || !tokenData.user || !tokenData.user.id) {
        throw new Error("Struktur data token tidak valid.");
      }
      const accessToken = tokenData.access_token;
      const userId = tokenData.user.id;
      console.log("🔑 [Token & User ID]: Berhasil diekstrak dari cookie.");
      console.log(`   - Access Token: ${accessToken.substring(0, 30)}...`);
      console.log(`   - User ID: ${userId}`);
      return {
        accessToken: accessToken,
        userId: userId
      };
    } catch (error) {
      console.error("❌ [Error]: Gagal memverifikasi kode.");
      console.error("🔍 [Detail Error]:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async create({
    lyrics = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    title = "aku bisa",
    styles = "Fear, Anger",
    ...rest
  }) {
    try {
      console.log("🚀 [Memulai]: Alur kerja pembuatan lagu...");
      const email = await this.getTemporaryEmail();
      await this.sendOtp(email);
      console.log("🔁 [Proses]: Mempolling email untuk kode verifikasi...");
      let verificationCode = null;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        const response = await this.malikApiClient.get("", {
          params: {
            action: "message",
            email: email
          }
        });
        console.log(`📦 [Data Polling Email]:`, response.data);
        if (response.data?.data?.length > 0) {
          const textContent = response.data.data[0].text_content;
          const codeMatch = textContent.match(/VERIFICATION CODE\r\n\r\n[\s\S]*?(\d{6})/);
          if (codeMatch && codeMatch[1]) {
            verificationCode = codeMatch[1];
            break;
          }
        }
        console.log(`⏳ [Status]: Kode verifikasi belum ditemukan, mencoba lagi dalam 5 detik... (${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
      if (!verificationCode) {
        throw new Error("Gagal mendapatkan kode verifikasi setelah beberapa kali percobaan.");
      }
      console.log(`✅ [Status]: Kode verifikasi ditemukan: ${verificationCode}`);
      const {
        accessToken,
        userId
      } = await this.verifyCode(email, verificationCode);
      console.log("🔗 [Proses]: Mengirim permintaan untuk membuat lagu...");
      const songPayload = {
        lyrics_mode: true,
        instrumental: false,
        lyrics: lyrics,
        description: "",
        title: title,
        styles: styles,
        style_negative: "",
        type: "lyrics",
        model: "v1.0",
        user_id: userId,
        user_email: email,
        is_private: false,
        ...rest
      };
      const createResponse = await this.apiClient.post("/song", songPayload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log("✅ [Respons]: Permintaan pembuatan lagu berhasil.");
      console.log("📦 [Data Respons]:", createResponse.data);
      const responseData = createResponse.data;
      if (!responseData) {
        throw new Error("Gagal mendapatkan task_id dan music_id dari respons pembuatan lagu.");
      }
      const task_id = await this.enc({
        data: responseData.data,
        token: accessToken
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("❌ [Error]: Alur kerja `create` gagal.");
      console.error("🔍 [Detail Error]:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async status({
    task_id: taskId,
    output = null
  }) {
    try {
      console.log(`🔗 [Proses]: Memeriksa status lagu dengan Task ID: ${taskId}...`);
      if (!taskId) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(taskId);
      const {
        data,
        token
      } = decryptedData;
      if (!data || !token) {
        throw new Error("Invalid task_id: Missing required data after decryption.");
      }
      let musicDataToProcess = [];
      if (output === null) {
        musicDataToProcess = data;
      } else if (typeof output === "number" && output >= 0 && output < data.length) {
        musicDataToProcess.push(data[output]);
      } else {
        console.warn(`⚠️ [Peringatan]: Nilai output (${output}) tidak valid. Tidak ada data yang akan diproses.`);
        return [];
      }
      const results = [];
      for (const item of musicDataToProcess) {
        const musicId = item.music_id;
        if (!musicId) {
          console.warn(`⚠️ [Peringatan]: Item dengan task_id ${taskId} tidak memiliki music_id. Melanjutkan ke item berikutnya.`);
          continue;
        }
        console.log(`🎵 [Proses]: Mengambil status untuk music_id: ${musicId}...`);
        const response = await this.apiClient.get(`/musicLibrary/getStatus?musicId=${musicId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        results.push(response.data);
        console.log("✅ [Respons]: Status lagu berhasil didapat untuk music_id:", musicId);
      }
      console.log("📦 [Data Respons Gabungan]:", results);
      return results;
    } catch (error) {
      console.error(`❌ [Error]: Gagal memeriksa status lagu dengan Task ID: ${taskId}.`);
      console.error("🔍 [Detail Error]:", error.response ? error.response.data : error.message);
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
      error: "Action (create or status) is required."
    });
  }
  const generator = new AiSongGenerator();
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