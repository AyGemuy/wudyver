import axios from "axios";
import {
  URLSearchParams
} from "url";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class VoeClient {
  constructor() {
    this.jar = new CookieJar();
    this.initialized = false;
    this.axios = wrapper(axios.create({
      maxRedirects: 5,
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://usevoe.com",
        referer: "https://usevoe.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
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
  async _ensureInit() {
    if (!this.initialized) {
      console.log("Proses: Klien belum diinisialisasi. Menjalankan init() secara otomatis...");
      await this.init();
    }
  }
  async logCurrentCookies() {
    try {
      const currentCookies = await this.jar.getCookieString("https://usevoe.com");
      console.log(`[COOKIE JAR STATUS] Cookies saat ini untuk usevoe.com:\n   "${currentCookies}"`);
    } catch (e) {
      console.error("Gagal mendapatkan string cookie dari jar.");
    }
  }
  async init() {
    if (this.initialized) {
      console.log("Proses: Klien sudah diinisialisasi. Melewatkan init().");
      return;
    }
    try {
      console.log("Proses: Inisialisasi sesi dimulai...");
      console.log("Proses: Mendapatkan CSRF token...");
      const csrfResponse = await this.axios.get("https://usevoe.com/api/auth/csrf");
      const csrfToken = csrfResponse.data?.csrfToken;
      if (!csrfToken) throw new Error("Gagal mendapatkan CSRF token.");
      console.log("Proses: CSRF token berhasil didapatkan.");
      await this.logCurrentCookies();
      console.log("Proses: Membuat email sementara...");
      const tempMailResponse = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = tempMailResponse.data?.email;
      if (!email) throw new Error("Gagal membuat email sementara.");
      console.log(`Proses: Email sementara dibuat: ${email}`);
      console.log("Proses: Mengirim email verifikasi...");
      const signInPayload = new URLSearchParams({
        email: email,
        callbackUrl: "https://usevoe.com/dashboard/ai-video/google-veo3",
        csrfToken: csrfToken,
        json: "true"
      });
      await this.axios.post("https://usevoe.com/api/auth/signin/email", signInPayload.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      console.log("Proses: Permintaan verifikasi email terkirim.");
      console.log("Proses: Menunggu link verifikasi (polling)...");
      let verificationLink = null;
      const maxAttempts = 60;
      let attempts = 0;
      while (!verificationLink && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        attempts++;
        console.log(`Proses: Percobaan ke-${attempts} untuk mengambil email...`);
        const messagesResponse = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const emailContent = messagesResponse.data?.data?.[0]?.text_content;
        if (emailContent) {
          const match = emailContent.match(/\[Sign in to your account\]\(([^)]+)\)/);
          verificationLink = match?.[1] || null;
        }
      }
      if (!verificationLink) throw new Error(`Gagal menemukan link verifikasi setelah ${maxAttempts} percobaan.`);
      console.log("Proses: Link verifikasi ditemukan.");
      console.log("[REDIRECT LOG] Mengikuti link verifikasi...");
      await this.axios.get(verificationLink);
      console.log("[REDIRECT LOG] Redirect selesai.");
      await this.logCurrentCookies();
      console.log("Proses: Inisialisasi berhasil. Sesi siap digunakan.");
      this.initialized = true;
      return {
        success: true
      };
    } catch (error) {
      console.error("Error selama proses inisialisasi:", error.message);
      this.initialized = false;
      throw error;
    }
  }
  async text_to_prompt({
    prompt = "",
    language = "en",
    ...rest
  }) {
    await this._ensureInit();
    try {
      console.log("Proses: Mengirim permintaan text-to-prompt...");
      const response = await this.axios.post("https://usevoe.com/api/free-tools/text-to-prompt", {
        prompt: prompt,
        language: language,
        ...rest
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log("Proses: Permintaan text-to-prompt berhasil.");
      return response.data;
    } catch (error) {
      console.error("Error pada text_to_prompt:", error.response?.data || error.message);
      throw error;
    }
  }
  async random_lyrics() {
    await this._ensureInit();
    try {
      console.log("Proses: Meminta lirik acak...");
      const response = await this.axios.post("https://usevoe.com/api/free-tools/random-lyrics", null, {
        headers: {
          "content-length": "0"
        }
      });
      console.log("Proses: Lirik acak berhasil didapatkan.");
      return response.data;
    } catch (error) {
      console.error("Error pada random_lyrics:", error.response?.data || error.message);
      throw error;
    }
  }
  async txt2music({
    prompt = "",
    style = "pop, pop",
    title = "Untitled",
    ...rest
  }) {
    await this._ensureInit();
    try {
      console.log("Proses: Mengirim permintaan text-to-music...");
      const response = await this.axios.post("https://usevoe.com/api/music/generate", {
        prompt: prompt,
        style: style,
        title: title,
        customMode: true,
        instrumental: false,
        isPrivate: false,
        action: "generate",
        model: "v2",
        ...rest
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log("Proses: Permintaan text-to-music berhasil dibuat.");
      const encryptedData = {
        taskId: response.data?.data,
        gen_cookie: await this.jar.getCookieString("https://usevoe.com"),
        gen_type: "music"
      };
      return await this.enc(encryptedData);
    } catch (error) {
      console.error("Error pada txt2music:", error.response?.data || error.message);
      throw error;
    }
  }
  async txt2img({
    prompt = "",
    aspectRatio = "3:4",
    ...rest
  }) {
    await this._ensureInit();
    try {
      console.log("Proses: Mengirim permintaan text-to-image...");
      const response = await this.axios.post("https://usevoe.com/api/image/generate", {
        prompt: prompt,
        aspectRatio: aspectRatio,
        raw: true,
        private: false,
        prompt_upsampling: false,
        output_format: "webp",
        output_quality: 80,
        mode: 6,
        safety_tolerance: 4,
        numImages: 1,
        ...rest
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log("Proses: Permintaan text-to-image berhasil dibuat.");
      const encryptedData = {
        taskId: response.data?.data,
        gen_cookie: await this.jar.getCookieString("https://usevoe.com"),
        gen_type: "image"
      };
      return await this.enc(encryptedData);
    } catch (error) {
      console.error("Error pada txt2img:", error.response?.data || error.message);
      throw error;
    }
  }
  async gen_lyrics({
    topic = "love",
    ...rest
  }) {
    await this._ensureInit();
    try {
      console.log("Proses: Menghasilkan lirik...");
      const response = await this.axios.post("https://usevoe.com/api/free-tools/generate-lyrics", {
        topic: topic,
        style: "random",
        mood: "random",
        structure: "verse-chorus",
        language: "en",
        ...rest
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log("Proses: Lirik berhasil dihasilkan.");
      return response.data;
    } catch (error) {
      console.error("Error pada gen_lyrics:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    input_type,
    task_id,
    input_cookie,
    ...rest
  }) {
    if (!task_id) throw new Error("task_id diperlukan untuk memeriksa status.");
    const decryptedData = await this.dec(task_id);
    const {
      taskId,
      gen_cookie,
      gen_type
    } = decryptedData;
    const cookie = input_cookie || gen_cookie;
    if (!cookie || !taskId) throw new Error("Membutuhkan taskId dan cookie untuk memeriksa status.");
    const type = input_type || gen_type;
    const url = type === "music" ? `https://usevoe.com/api/music/musics-by-taskId/${taskId}` : `https://usevoe.com/api/image/status?task_id=${taskId}`;
    try {
      if (cookie) {
        console.log(`Proses: Menggunakan cookie kustom untuk permintaan status...`);
        const tempAxios = axios.create({
          headers: this.axios.defaults.headers
        });
        const response = await tempAxios.get(url, {
          headers: {
            cookie: cookie
          }
        });
        console.log("Proses: Status (kustom) berhasil diperiksa.");
        return response.data;
      } else {
        console.log(`Proses: Menggunakan cookie jar sesi untuk permintaan status...`);
        const response = await this.axios.get(url);
        console.log("Proses: Status (sesi) berhasil diperiksa.");
        return response.data;
      }
    } catch (error) {
      console.error(`Error saat memeriksa status ${type}:`, error.response?.data || error.message);
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
      error: "Action is required."
    });
  }
  const api = new VoeClient();
  try {
    let response;
    switch (action) {
      case "text_to_prompt":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt are required for text_to_prompt."
          });
        }
        response = await api.text_to_prompt(params);
        return res.status(200).json(response);
      case "random_lyrics":
        response = await api.random_lyrics();
        return res.status(200).json(response);
      case "txt2music":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2music."
          });
        }
        response = await api.txt2music(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2img(params);
        return res.status(200).json({
          task_id: response
        });
      case "gen_lyrics":
        if (!params.topic) {
          return res.status(400).json({
            error: "Topic is required for gen_lyrics."
          });
        }
        response = await api.gen_lyrics(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'text_to_prompt', 'random_lyrics', 'txt2music', 'txt2img', 'gen_lyrics', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}