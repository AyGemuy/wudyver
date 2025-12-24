import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
import CryptoJS from "crypto-js";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class IMyFoneClient {
  constructor() {
    this.baseUrlTTS = "https://tts-voxbox-api.imyfone.com";
    this.baseUrlVoice = "https://voxbox-voice-ma-api.imyfone.com";
    this.baseUrlVoiceChanger = "https://vcapis.topmediai.com";
    this.deviceId = uuidv4();
    this.touristId = null;
    this.sessionRegistered = false;
    this.cookieJar = new CookieJar();
    this.aesKey = CryptoJS.enc.Utf8.parse("123456789imyfone123456789imyfone");
    this.aesIv = CryptoJS.enc.Utf8.parse("123456789imyfone");
    this.globalHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://filme.imyfone.com",
      priority: "u=1, i",
      referer: "https://filme.imyfone.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "web-req": "2",
      "x-requested-with": "TTS"
    };
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      for (const key in this.globalHeaders) {
        if (this.globalHeaders.hasOwnProperty(key) && !config.headers[key]) {
          config.headers[key] = this.globalHeaders[key];
        }
      }
      if (this.sessionRegistered && this.deviceId && this.touristId) {
        config.headers["device"] = this.deviceId;
        config.headers["touristcode"] = this.touristId;
      } else {
        config.headers["device"] = this.deviceId;
        config.headers["touristcode"] = `Guest_${this.randomID(10)}`;
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      return response;
    }, error => {
      return Promise.reject(error);
    });
  }
  decryptOSSURL(encryptedText) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.aesKey, {
        iv: this.aesIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return null;
    }
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  async initializeSession() {
    if (this.sessionRegistered && this.deviceId && this.touristId) {
      console.log("✓ Session already registered");
      return {
        device_id: this.deviceId,
        tourist_id: this.touristId
      };
    }
    console.log("→ Initializing session...");
    try {
      const touristIdRes = await this.axiosInstance.get(`${this.baseUrlTTS}/v3/user/tourist_id`, {
        headers: {
          device: this.deviceId,
          touristcode: this.deviceId
        }
      });
      if (touristIdRes.data.check_code === 2e5 && touristIdRes.data.data) {
        this.touristId = touristIdRes.data.data.tourist_id;
        const sessionId = touristIdRes.data.data.session_id;
        await this.axiosInstance.get(`${this.baseUrlTTS}/v3/user/info_tourist`, {
          params: {
            tourist_id: this.touristId,
            session_id: sessionId
          },
          headers: {
            device: this.deviceId,
            touristcode: this.touristId
          }
        });
        this.sessionRegistered = true;
        console.log("✓ Session initialized successfully");
        return {
          device_id: this.deviceId,
          tourist_id: this.touristId
        };
      } else {
        throw new Error("Failed to get valid tourist ID from API.");
      }
    } catch (error) {
      console.log("✗ Session initialization failed");
      throw error;
    }
  }
  async search_tts({
    searchText = "",
    pageNum = 1,
    productId = 1,
    pageSize = 10,
    ...rest
  } = {}) {
    console.log("→ Searching TTS voices...");
    try {
      await this.initializeSession();
      const form = new FormData();
      form.append("search_text", searchText);
      form.append("page_num", pageNum.toString());
      form.append("product_id", productId.toString());
      form.append("page_size", pageSize.toString());
      for (const key in rest) {
        if (Object.prototype.hasOwnProperty.call(rest, key)) {
          form.append(key, rest[key].toString());
        }
      }
      const response = await this.axiosInstance.post(`${this.baseUrlTTS}/v3/voice/list`, form);
      console.log("✓ TTS search completed");
      return response.data;
    } catch (error) {
      console.log("✗ TTS search failed");
      throw error;
    }
  }
  async create_tts({
    accent = "English(US)",
    emotionName = "Default",
    text = "Hello, this is a default text.",
    speed = 1,
    volume = 50,
    pitch = 3,
    voiceId = "c21bcf4a-c1cd-11ef-873d-00163e022d5e",
    articleTitle = "Unnamed",
    backgroundUrl = "",
    isAudition = 1,
    countryCode = "US"
  } = {}) {
    console.log("→ Creating TTS audio...");
    try {
      if (!this.sessionRegistered || !this.deviceId || !this.touristId) {
        await this.initializeSession();
      }
      const form = new FormData();
      form.append("accent", accent);
      form.append("emotion_name", emotionName);
      form.append("text", text);
      form.append("speed", speed.toString());
      form.append("volume", volume.toString());
      form.append("pitch", pitch.toString());
      form.append("voice_id", voiceId);
      form.append("article_title", articleTitle);
      form.append("background_url", backgroundUrl);
      form.append("is_audition", isAudition.toString());
      form.append("session_id", this.deviceId);
      form.append("tourist_id", this.touristId);
      form.append("country_code", countryCode);
      const response = await this.axiosInstance.post(`${this.baseUrlTTS}/v5/voice/tts_tourist`, form);
      if (response.data.check_code === 2e5) {
        console.log("✓ TTS audio created successfully");
        if (response.data.data && response.data.data.oss_url) {
          const decryptedUrl = this.decryptOSSURL(response.data.data.oss_url);
          response.data.data.decrypted_oss_url = decryptedUrl;
        }
      } else {
        console.log("⚠ TTS creation failed");
      }
      return response.data;
    } catch (error) {
      console.log("✗ TTS creation error");
      throw error;
    }
  }
  async search_voice({
    usePlatform = "Web_Library",
    usePlatformCategoryName = "",
    voiceCountry = "",
    name = "",
    pageSize = 12,
    pageNum = 1
  } = {}) {
    console.log("→ Searching voice library...");
    try {
      const response = await this.axiosInstance.get(`${this.baseUrlVoice}/magicmic_web/voice/list`, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          Connection: "keep-alive",
          Origin: "https://filme.imyfone.com",
          Referer: "https://filme.imyfone.com/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        params: {
          use_platform: usePlatform,
          use_platform_category_name: usePlatformCategoryName,
          voice_country: voiceCountry,
          name: name,
          page_size: pageSize,
          page_num: pageNum
        }
      });
      console.log("✓ Voice library search completed");
      return response.data;
    } catch (error) {
      console.log("✗ Voice library search failed");
      throw error;
    }
  }
  formatResponse(response) {
    const result = {
      ...response.data
    };
    if (result.status === 200 && result.data) {
      const audioBaseUrl = "https://vcapis.topmediai.com/audio/";
      result.audioUrl = audioBaseUrl + result.data;
    } else {
      result.audioUrl = null;
    }
    return result;
  }
  async create_voice({
    audioUrl = "https://server6.mp3quran.net/jbreen/001.mp3",
    voiceType = "ai-power-sweetgirl"
  } = {}) {
    console.log("→ Creating voice change...");
    try {
      console.log("→ Downloading audio file...");
      const audioResponse = await this.axiosInstance.get(audioUrl, {
        responseType: "arraybuffer"
      });
      const audioBlob = new Blob([audioResponse.data], {
        type: "audio/mp3"
      });
      const form = new FormData();
      form.append("file", audioBlob, "blob");
      form.append("voiceType", voiceType);
      console.log("→ Uploading and processing...");
      const response = await this.axiosInstance.post(`${this.baseUrlVoiceChanger}/upload/voiceChanger`, form, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          Connection: "keep-alive",
          Origin: "https://filme.imyfone.com",
          Referer: "https://filme.imyfone.com/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      if (response.data.status === 200) {
        console.log("✓ Voice change created successfully");
      } else {
        console.log("⚠ Voice change failed");
      }
      return this.formatResponse(response);
    } catch (error) {
      console.log("✗ Voice change error");
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
        action: "search_tts | create_tts | search_voice | create_voice"
      }
    });
  }
  const imyfoneClient = new IMyFoneClient();
  try {
    let result;
    switch (action) {
      case "search_tts":
        result = await imyfoneClient[action](params);
        break;
      case "create_tts":
        result = await imyfoneClient[action](params);
        break;
      case "search_voice":
        result = await imyfoneClient[action](params);
        break;
      case "create_voice":
        result = await imyfoneClient[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search_tts | create_tts | search_voice | create_voice`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}