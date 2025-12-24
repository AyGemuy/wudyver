import fetch from "node-fetch";
import Encoder from "@/lib/encoder";
const FIREBASE_API_KEY = "AIzaSyDM1sggN_LRJRlxuTZ-EwQRf8FL4xmxlLY";
const FIREBASE_ANONYMOUS_SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
class MusicGenerator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "https://dial-api.com/api/applications/ai-song-android/";
    this.jwt = options.jwt || null;
    console.log("Proses: BackendService diinisialisasi.");
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
  async getAnonymousToken() {
    console.log("Proses: [Langkah 1] Mencoba mendapatkan token anonim Firebase...");
    try {
      const response = await fetch(FIREBASE_ANONYMOUS_SIGN_IN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          returnSecureToken: true
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gagal mendapatkan token Firebase: ${errorData.error?.message || response.statusText}`);
      }
      const data = await response.json();
      console.log("Proses: Token anonim Firebase berhasil didapatkan.");
      return data.idToken;
    } catch (error) {
      console.error("Error saat mendapatkan token anonim:", error);
      throw error;
    }
  }
  async signUp(params = {}) {
    const {
      payment_gateway_id = Math.random().toString(36).substring(2),
        adv_params = "{}",
        invite_code = Math.random().toString(36).substring(2)
    } = params;
    console.log(`\n--- Memulai Proses Sign Up / Registrasi ke Backend ---`);
    try {
      const firebaseToken = await this.getAnonymousToken();
      if (!firebaseToken) throw new Error("Tidak bisa mendapatkan token Firebase.");
      console.log("Proses: [Langkah 2] Mengirim token ke API /users...");
      const form = new URLSearchParams();
      form.append("jwt", firebaseToken);
      form.append("payment_gateway_id", payment_gateway_id);
      form.append("adv_params", adv_params);
      form.append("invite_code", invite_code);
      const userData = await this.apiCall("users", {
        method: "POST",
        body: form,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }, {
        useAuth: false
      });
      if (userData) {
        console.log("Proses: [Langkah 3] Sign up berhasil. JWT disimpan.");
        this.jwt = firebaseToken;
        return userData;
      }
      return null;
    } catch (error) {
      console.error("Error selama sign up:", error.message);
      return null;
    }
  }
  async ensureJwt(providedToken) {
    if (providedToken) return providedToken;
    if (this.jwt) return this.jwt;
    console.log("Proses: JWT tidak ada. Melakukan sign up otomatis...");
    await this.signUp();
    if (!this.jwt) throw new Error("Gagal inisialisasi sesi: sign up tidak menghasilkan JWT.");
    return this.jwt;
  }
  async apiCall(endpoint, options, config = {}) {
    const {
      jwt: configJwt,
      useAuth = true
    } = config;
    try {
      const token = useAuth ? await this.ensureJwt(configJwt) : null;
      const url = new URL(endpoint, this.baseUrl);
      const headers = {
        "User-Agent": "NodeJS/1.0"
      };
      if (useAuth && token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      options.headers = {
        ...headers,
        ...options.headers
      };
      console.log(`Proses: ${options.method || "GET"} ${url}`);
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error Body: ${errorBody}`);
        throw new Error(`Request gagal: ${response.status} ${response.statusText}`);
      }
      const responseData = await response.json().catch(() => null);
      console.log("Proses: Request berhasil.");
      return responseData?.response?.body || responseData;
    } catch (error) {
      console.error(`Error di apiCall(${endpoint}):`, error.message);
      return null;
    }
  }
  async generate(params) {
    const {
      prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
        title = "Rise of the Titans",
        vocal = true,
        gender = "",
        mood = "",
        genre = "",
        lyrics = "",
        tags = "",
        imageData = "",
        jwt
    } = params;
    console.log(`\n--- Memulai Proses Generate Lagu ---`);
    const form = new URLSearchParams();
    form.append("prompt", prompt);
    form.append("title", title);
    form.append("instrumental", vocal === false ? "1" : "0");
    form.append("gender", gender);
    form.append("mood", mood);
    form.append("genre", genre);
    form.append("lyrics", lyrics);
    form.append("tags", tags);
    form.append("imageData", imageData);
    const result = await this.apiCall("songs", {
      method: "POST",
      body: form,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }, {
      jwt: jwt
    });
    if (!result?.taskId || !result?.provider) {
      throw new Error("Gagal generate: taskId atau provider tidak ditemukan.");
    }
    const payload = {
      jwt: this.jwt,
      taskId: result.taskId,
      provider: result.provider
    };
    const task_id = await this.enc(payload);
    console.log(`[GENERATE] task_id created: ${task_id}`);
    return {
      task_id: task_id,
      provider: result.provider,
      jwt: this.jwt
    };
  }
  async status(params) {
    const {
      task_id,
      jwt
    } = params;
    console.log(`[STATUS] Decoding task_id: ${task_id}`);
    let decoded;
    try {
      decoded = JSON.parse(await this.dec(task_id));
    } catch (err) {
      console.error("Gagal decode task_id:", err);
      return null;
    }
    const {
      taskId,
      provider
    } = decoded;
    if (!taskId || !provider) {
      console.error("Error: taskId atau provider tidak valid dari task_id.");
      return null;
    }
    console.log(`\n--- Cek Status Task: ${taskId} ---`);
    const endpoint = `songs/providers/${provider}/tasks/${taskId}`;
    return await this.apiCall(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    }, {
      jwt: jwt
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new MusicGenerator();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt && !params.lyrics) {
          return res.status(400).json({
            error: "Parameter 'prompt' atau 'lyrics' wajib diisi."
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi."
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Gunakan: generate, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}