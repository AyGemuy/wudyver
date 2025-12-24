import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class LalalsAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://devapi.lalals.com",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        origin: "https://lalals.com",
        referer: "https://lalals.com/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "ngrok-skip-browser-warning": "yes",
        "content-type": "application/json"
      }
    });
    this.mailApi = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v15`
    });
    this.accessToken = null;
    this.userDetails = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }
  async _performInit() {
    try {
      const email = await this._createTempEmail();
      const password = this._generatePassword();
      const signupResponse = await this.api.post("/auth/signup", {
        email: email,
        password: password
      });
      const tempToken = signupResponse.data.token;
      if (!tempToken) throw new Error("Gagal mendaftar, tidak ada token sementara.");
      const otp = await this._getOtp(email);
      const confirmResponse = await this.api.post("/auth/confirm-signup", {
        otp: parseInt(otp)
      }, {
        headers: {
          Authorization: `Bearer ${tempToken}`
        }
      });
      if (confirmResponse.data.success) {
        this.accessToken = confirmResponse.data.accessToken;
        this.userDetails = confirmResponse.data.userDetails;
        this.api.defaults.headers.common["Authorization"] = `Bearer ${this.accessToken}`;
        this.isInitialized = true;
      } else {
        throw new Error(confirmResponse.data.message || "Gagal mengkonfirmasi pendaftaran.");
      }
    } catch (error) {
      throw new Error(`Inisialisasi API gagal: ${error.message}`);
    }
  }
  async _ensureInitialized() {
    if (this.isInitialized) return;
    if (!this.initializationPromise) {
      this.initializationPromise = this._performInit();
    }
    await this.initializationPromise;
  }
  _generatePassword() {
    return `Lalals${Math.random().toString(36).substring(2, 10)}`;
  }
  async _createTempEmail() {
    try {
      const response = await this.mailApi.get("?action=create");
      if (response.data && response.data.email) {
        return response.data.email;
      }
      throw new Error("Gagal membuat email sementara dari API.");
    } catch (error) {
      throw new Error(`Gagal membuat email sementara: ${error.message}`);
    }
  }
  async _getOtp(email) {
    for (let i = 0; i < 20; i++) {
      try {
        const response = await this.mailApi.get(`?action=message&email=${email}`);
        if (response.data && response.data.length > 0) {
          const otpMatch = response.data[0].text.match(/\b(\d{4})\b/);
          if (otpMatch && otpMatch[1]) {
            return otpMatch[1];
          }
        }
      } catch (error) {}
      await sleep(2e3);
    }
    throw new Error("Gagal mendapatkan OTP dalam batas waktu.");
  }
  async _getVoiceDetails(voiceSlug) {
    try {
      const response = await this.api.get(`/voices/${voiceSlug}`);
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mendapatkan detail suara '${voiceSlug}': ${error.message}`);
    }
  }
  async _pollForResult(conversionId, timeout = 180) {
    const pollInterval = 5;
    const maxAttempts = Math.ceil(timeout / pollInterval);
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.api.get(`/projects/front/get-one-by-id/${conversionId}`);
        const project = response.data;
        if (project) {
          const status = project.conversion_status;
          if (status === "SUCCESS") {
            return project;
          } else if (status === "FAILED" || status === "ERROR") {
            throw new Error(`Konversi gagal dengan status: ${status}.`);
          }
        }
      } catch (error) {
        if (!error.response || error.response.status !== 404) {}
      }
      await sleep(pollInterval * 1e3);
    }
    throw new Error(`Waktu tunggu habis untuk ID konversi: ${conversionId}.`);
  }
  async search({
    query = "",
    page = 1,
    limit = 15
  }) {
    await this._ensureInitialized();
    const payload = {
      sort: {
        field: "use_count",
        order: "desc"
      },
      voice_name: query,
      page: page,
      limit: limit,
      is_original: false
    };
    const response = await this.api.post("/voices/front/get-all", payload);
    return response.data;
  }
  async projects({
    offset = 0,
    limit = 10
  }) {
    await this._ensureInitialized();
    const response = await this.api.get(`/user/${this.userDetails.id}/musicai?offset=${offset}&limit=${limit}`);
    return response.data;
  }
  async music({
    prompt,
    lyrics
  }) {
    await this._ensureInitialized();
    const payload = {
      user_id: this.userDetails.id,
      prompt: prompt,
      lyrics: lyrics,
      make_instrumental: false,
      key: "",
      bpm: 0
    };
    const response = await this.api.post("/projects/front/do-music-ai", payload);
    const conversionId = response.data.conversion_id_1 || response.data.conversion_id || response.data?.id;
    if (!conversionId) throw new Error("Gagal memulai pembuatan musik, tidak ada ID pelacakan.");
    return await this._pollForResult(conversionId);
  }
  async voice({
    audioUrl,
    voice: voiceSlug = "drake",
    duration: audioDuration = 5
  }) {
    await this._ensureInitialized();
    if (!audioUrl || !audioDuration) throw new Error("Paramenter `audioUrl` dan `audioDuration` dibutuhkan.");
    const voiceDetails = await this._getVoiceDetails(voiceSlug);
    const extension = new URL(audioUrl).pathname.split(".").pop() || "webm";
    const {
      url: s3Url,
      bucketKey
    } = (await this.api.post("/projects/get-upload-url", {
      extension: extension
    })).data;
    const audioBuffer = (await axios.get(audioUrl, {
      responseType: "arraybuffer"
    })).data;
    await axios.put(s3Url, audioBuffer, {
      headers: {
        "Content-Type": `audio/${extension}`
      }
    });
    const payload = {
      items: [{
        bucketKey: bucketKey,
        audio_duration: String(audioDuration),
        preferred_filename: `Rec-${Date.now()}`,
        file: null,
        audio: ""
      }],
      user_id: this.userDetails.id,
      voice_api: voiceDetails.voice_id_api,
      voice_id: voiceDetails.id,
      conversionType: "VOICE_TO_VOICE",
      gender: voiceDetails.gender?.charAt(0).toLowerCase() || "m",
      cover: "0",
      bg_remove: "0",
      pitch: "0"
    };
    const createResponse = await this.api.post("/projects/create/multiple", payload);
    const conversionId = createResponse.data.conversions?.[0]?.id || createResponse.data?.id;
    if (!conversionId) throw new Error("Gagal memulai konversi suara, tidak ada ID pelacakan.");
    return await this._pollForResult(conversionId);
  }
  async tts({
    text,
    voice: voiceSlug = "drake"
  }) {
    await this._ensureInitialized();
    const voiceDetails = await this._getVoiceDetails(voiceSlug);
    const payload = {
      text: text,
      voice_id: voiceDetails.id,
      user_id: this.userDetails.id,
      gender: voiceDetails.gender?.charAt(0).toLowerCase() || "m",
      conversionType: "TTS",
      voice_api: voiceDetails.voice_id_api,
      audio: "",
      bucketKey: ""
    };
    const response = await this.api.post("/projects/front/create/tts", payload);
    const conversionId = response.data.conversion_id;
    if (!conversionId) throw new Error("Gagal memulai TTS, tidak ada ID pelacakan.");
    return await this._pollForResult(conversionId);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  const allowedActions = ["search", "projects", "music", "voice", "tts"];
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: allowedActions.join(" | ")
      }
    });
  }
  try {
    let result;
    const lalalsApi = new LalalsAPI();
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (for action: ${action})`
          });
        }
        result = await lalalsApi.search(params);
        break;
      case "projects":
        result = await lalalsApi.projects(params);
        break;
      case "music":
        if (!params.prompt || !params.lyrics) {
          return res.status(400).json({
            error: `Missing required fields: prompt, lyrics (for action: ${action})`
          });
        }
        result = await lalalsApi.music(params);
        break;
      case "voice":
        if (!params.audioUrl || !params.duration) {
          return res.status(400).json({
            error: `Missing required fields: audioUrl, duration (for action: ${action})`
          });
        }
        result = await lalalsApi.voice(params);
        break;
      case "tts":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (for action: ${action})`
          });
        }
        result = await lalalsApi.tts(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: '${action}'. Allowed actions are: ${allowedActions.join(", ")}`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Processing error for action '${action}': ${error.message}`
    });
  }
}