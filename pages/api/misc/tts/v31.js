import WebSocket from "ws";
import axios from "axios";
import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, "");
const toSnakeCaseKeys = obj => {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCaseKeys(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const newKey = toSnakeCase(key);
      result[newKey] = toSnakeCaseKeys(obj[key]);
      return result;
    }, {});
  }
  return obj;
};
class EdgeTTS {
  constructor() {
    this.trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    this.wssUrl = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
    this.voiceListUrl = "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list";
    this.voiceCache = [];
  }
  getSec() {
    const date = new Date();
    const ticks = date.getTime() / 1e3 + 11644473600;
    const roundedTicks = ticks - ticks % 300;
    const strToHash = (roundedTicks * 1e7).toFixed(0) + this.trustedClientToken;
    return crypto.createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
  }
  getId() {
    return uuidv4().replace(/-/g, "");
  }
  async voice_list({
    ...rest
  } = {}) {
    const secMsGec = this.getSec();
    console.log(`[EdgeTTS] Mengambil daftar suara dari server...`);
    const config = {
      method: "get",
      url: `${this.voiceListUrl}?trustedclienttoken=${this.trustedClientToken}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68`,
      headers: {
        accept: "*/*",
        authority: "speech.platform.bing.com",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...rest?.headers
      }
    };
    try {
      const response = await axios(config);
      const formattedData = toSnakeCaseKeys(response.data);
      this.voiceCache = formattedData;
      console.log(`[EdgeTTS] Sukses mengambil ${formattedData.length} suara.`);
      return formattedData;
    } catch (error) {
      console.error(`[EdgeTTS] Gagal mengambil daftar suara: ${error.message}`);
      throw error;
    }
  }
  createSSML(text, voice, rate, pitch, volume) {
    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
            <voice name='${voice}'>
                <prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>
                    ${text}
                </prosody>
            </voice>
        </speak>`;
  }
  async _findVoice(voiceInput) {
    if (!voiceInput) return "Microsoft Server Speech Text to Speech Voice (id-ID, ArdiNeural)";
    if (this.voiceCache.length === 0) {
      try {
        await this.voice();
      } catch (e) {
        console.warn("[EdgeTTS] Gagal fetch voice_list voice, mencoba menggunakan input mentah.");
        return voiceInput;
      }
    }
    const inputLower = voiceInput.toLowerCase().trim();
    const foundVoice = this.voiceCache.find(v => {
      if (v.short_name && v.short_name.toLowerCase() === inputLower) return true;
      if (v.name && v.name.toLowerCase() === inputLower) return true;
      return false;
    });
    if (foundVoice) {
      console.log(`[EdgeTTS] Voice ditemukan: "${voiceInput}" -> "${foundVoice.short_name}"`);
      return foundVoice.name;
    }
    console.warn(`[EdgeTTS] Voice "${voiceInput}" tidak ditemukan di voice_list. Menggunakan raw input.`);
    return voiceInput;
  }
  async generate({
    text,
    voice,
    rate,
    pitch,
    volume,
    ...rest
  }) {
    const selectedVoice = await this._findVoice(voice);
    const selectedRate = rate || "+0%";
    const selectedPitch = pitch || "+0Hz";
    const selectedVolume = volume || "+0%";
    const connectId = this.getId();
    const secMsGec = this.getSec();
    console.log(`[EdgeTTS] generate Audio... Voice: ${selectedVoice}`);
    const wsUrl = `${this.wssUrl}?TrustedClientToken=${this.trustedClientToken}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${connectId}`;
    return new Promise((resolve, reject) => {
      const audioChunks = [];
      const ws = new WebSocket(wsUrl, {
        headers: {
          Pragma: "no-cache",
          Origin: "https://aitwo.co",
          "Accept-Language": "id-ID",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "Cache-Control": "no-cache"
        }
      });
      ws.on("open", () => {
        const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
        const speechConfig = {
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "true"
                },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3"
              }
            }
          }
        };
        ws.send(`X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(speechConfig)}`);
        const ssml = this.createSSML(text, selectedVoice, selectedRate, selectedPitch, selectedVolume);
        ws.send(`X-RequestId:${connectId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`);
      });
      ws.on("message", (data, isBinary) => {
        if (isBinary || data instanceof Buffer) {
          const headerLength = data.readUInt16BE(0);
          if (data.length > headerLength + 2) {
            const headerStr = data.subarray(2, headerLength + 2).toString();
            if (headerStr.includes("Path:audio")) {
              audioChunks.push(data.subarray(headerLength + 2));
            }
          }
        } else {
          if (data.toString().includes("Path:turn.end")) {
            ws.close();
          }
        }
      });
      ws.on("close", () => {
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(new Error("No audio received"));
        }
      });
      ws.on("error", err => reject(err));
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
  const api = new EdgeTTS();
  try {
    let response;
    switch (action) {
      case "voice_list":
        response = await api.voice_list(params);
        return res.status(200).json(response);
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'generate'."
          });
        }
        const audioResult = await api.generate(params);
        res.setHeader("Content-Type", "audio/mp3");
        res.setHeader("Content-Disposition", 'inline; filename="generated_audio.mp3"');
        return res.status(200).send(audioResult);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'voice_list', 'generate'.`
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}