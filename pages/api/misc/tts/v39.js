import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const VOICE_DATA = {
  "American English": ["af_heart", "am_echo", "am_michael", "af_alloy", "af_aoede", "af_bella", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky", "am_adam", "am_eric", "am_fenrir", "am_liam", "am_onyx", "am_puck", "am_santa"],
  "British English": ["bm_lewis", "bm_daniel", "bm_fable", "bm_george", "bf_alice", "bf_emma", "bf_isabella", "bf_lily"],
  Japanese: ["jf_alpha", "jf_gongitsune", "jf_nezumi", "jf_tebukuro", "jm_kumo"],
  Chinese: ["zf_xiaobei", "zf_xiaoni", "zf_xiaoxiao", "zf_xiaoyi", "zm_yunjian", "zm_yunxi", "zm_yunxia", "zm_yunyang"],
  "Spanish/Euro": ["ef_dora", "em_alex", "em_santa"],
  French: ["ff_siwis"],
  Italian: ["if_sara", "im_nicola"],
  Portuguese: ["pf_dora", "pm_alex", "pm_santa"]
};
const ALL_VOICES = Object.values(VOICE_DATA).flat();
class ImageUpscalingTTS {
  constructor() {
    this.jar = new CookieJar();
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://image-upscaling.net/tts/en.html",
      origin: "https://image-upscaling.net",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = wrapper(axios.create({
      baseURL: "https://image-upscaling.net",
      jar: this.jar,
      withCredentials: true,
      headers: this.headers
    }));
  }
  getVoiceList() {
    return VOICE_DATA;
  }
  isValidVoice(voiceId) {
    return ALL_VOICES.includes(voiceId);
  }
  async initPage() {
    try {
      await this.client.get("/tts/en.html", {
        headers: {
          ...this.headers,
          "Upgrade-Insecure-Requests": "1",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate"
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  async submitTTS(text, voice, speed = 1) {
    try {
      const payload = {
        text: text,
        voice: voice,
        speed: String(speed)
      };
      await this.client.post("/tts_submit", payload);
      return true;
    } catch (e) {
      throw new Error(`TTS Submit Failed: ${e.message}`);
    }
  }
  async getTTSData() {
    try {
      const {
        data
      } = await this.client.get("/tts_get_data");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }
  async resolveMedia(url, outputType) {
    try {
      if (outputType === "url") {
        const res = await this.client.head(url);
        return {
          result: url,
          contentType: res.headers["content-type"] || "audio/mpeg",
          size: res.headers["content-length"]
        };
      }
      const res = await this.client.get(url, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(res.data);
      const contentType = res.headers["content-type"] || "audio/mpeg";
      if (outputType === "base64") {
        return {
          result: `data:${contentType};base64,${buffer.toString("base64")}`,
          contentType: contentType,
          size: buffer.length
        };
      }
      if (outputType === "buffer") {
        return {
          result: buffer,
          contentType: contentType,
          size: buffer.length
        };
      }
    } catch (e) {
      throw new Error(`Media resolution failed: ${e.message}`);
    }
  }
  async generate({
    text,
    voice = "af_sarah",
    speed = 1,
    output: outputType = "url"
  }) {
    try {
      let selectedVoice = voice;
      if (!this.isValidVoice(voice)) {
        console.warn(`[Warn] Voice '${voice}' tidak ditemukan. Menggunakan default 'af_sarah'.`);
        selectedVoice = "af_sarah";
      }
      console.log(`[TTS] Processing: "${text}" | Voice: ${selectedVoice} | Speed: ${speed}`);
      await this.initPage();
      await this.submitTTS(text, selectedVoice, speed);
      let downloadUrl = null;
      let attempts = 0;
      const startTime = Date.now();
      const maxAttempts = 60;
      while (!downloadUrl && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3e3));
        const history = await this.getTTSData();
        const item = history.find(h => h.status === "processed" && h.text === text && h.voice === selectedVoice && h.req_id >= startTime - 5e3);
        if (item?.result) {
          downloadUrl = item.result;
        }
        attempts++;
      }
      if (!downloadUrl) throw new Error("Timeout: Gagal mendapatkan URL audio (Server sibuk/limit).");
      const data = await this.resolveMedia(downloadUrl, outputType);
      return {
        status: "success",
        ...data,
        meta: {
          voice: selectedVoice,
          speed: speed
        }
      };
    } catch (error) {
      console.error("[TTS Error]", error.message);
      return {
        status: "failed",
        error: error.message
      };
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
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "voice_list"]
    });
  }
  const api = new ImageUpscalingTTS();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'generate'"
          });
        }
        result = await api.generate(params);
        break;
      case "voice_list":
        result = await api.getVoiceList();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "voice_list"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}