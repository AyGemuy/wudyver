import axios from "axios";
import crypto from "crypto";
class XenVoice {
  constructor() {
    this.base = "https://voicechanger.xen-studios.com";
    this.ua = "ktor-client";
    this.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzU5ODEzOTc5fQ.X3F9omxra7cvMAhYu3qIuF6vDB7-KV2qJOfu1-3eb9Q";
    this.cfg = [];
    this.init();
  }
  init() {
    const langs = [{
      code: "de",
      name: "German"
    }, {
      code: "en",
      name: "English"
    }, {
      code: "es",
      name: "Spanish"
    }, {
      code: "fr",
      name: "French"
    }, {
      code: "hi",
      name: "Hindi"
    }, {
      code: "it",
      name: "Italian"
    }, {
      code: "ja",
      name: "Japanese"
    }, {
      code: "ko",
      name: "Korean"
    }, {
      code: "pl",
      name: "Polish"
    }, {
      code: "pt",
      name: "Portuguese"
    }, {
      code: "ru",
      name: "Russian"
    }, {
      code: "tr",
      name: "Turkish"
    }, {
      code: "zh",
      name: "Chinese"
    }];
    let idCount = 0;
    for (const lang of langs) {
      for (let i = 0; i < 10; i++) {
        this.cfg.push({
          id: idCount++,
          code: `${lang.code}_speaker_${i}`,
          name: `${lang.name} Speaker ${i + 1}`,
          lang: lang.code,
          prompt: `v2/${lang.code}_speaker_${i}`
        });
      }
    }
  }
  log(msg) {
    console.log(`[XenVoice] ${new Date().toLocaleTimeString()} -> ${msg}`);
  }
  rndName() {
    return `req_${crypto.randomBytes(8).readBigUInt64BE().toString()}`;
  }
  find(query) {
    return this.cfg.find(s => s.id === query || s.code === query);
  }
  voice_list() {
    this.log(`Fetching voice list. Total available: ${this.cfg.length}`);
    return {
      status: true,
      total: this.cfg.length,
      voices: this.cfg
    };
  }
  async generate({
    text,
    speaker,
    ...rest
  }) {
    try {
      this.log(`Generating audio for speaker: ${speaker}`);
      if (!text) throw new Error("Validation Error: 'text' is required.");
      const spkData = this.find(speaker);
      if (!spkData) {
        const hint = this.cfg[10]?.code || "en_speaker_0";
        throw new Error(`Speaker Error: '${speaker}' unavailable. Try ID (e.g., 10) or Code (e.g., '${hint}').`);
      }
      const payload = {
        text: text,
        history_prompt: spkData.prompt,
        speaker_id: spkData.id,
        fileName: rest.fileName ? rest.fileName : this.rndName(),
        text_temp: rest.text_temp || .6,
        waveform_temp: rest.waveform_temp || .6
      };
      this.log(`Payload: ${payload.fileName} | ID: ${spkData.id} (${spkData.name})`);
      const response = await axios.post(`${this.base}/text_to_audio`, payload, {
        headers: {
          "User-Agent": this.ua,
          Accept: "application/json",
          "Content-Type": "application/json",
          authorization: `Bearer ${this.token}`,
          "accept-charset": "UTF-8"
        }
      });
      const relativePath = response?.data?.audio_output;
      if (!relativePath) throw new Error("Empty audio_output from server.");
      const fullUrl = relativePath.includes("http") ? relativePath : `${this.base}/${relativePath.replace(/^\.\//, "")}`;
      this.log("Success.");
      return {
        status: true,
        result: fullUrl,
        translation: response?.data?.translation?.translated_text || text
      };
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || "Unknown error";
      this.log(`Failed: ${errMsg}`);
      return {
        status: false,
        error: errMsg
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
  const api = new XenVoice();
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
        result = api.voice_list();
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