import WebSocket from "ws";
import axios from "axios";
import crypto from "crypto";
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
class VoicerTool {
  constructor() {
    this.apiToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    this.wssUrl = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
    this.voicesUrl = "https://voicertool.com/voices.json";
    this.secMsGecVersion = "1-139.0.3405.86";
    this.voiceCache = null;
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    }).replace(/-/g, "");
  }
  async generateSecMsGec() {
    const WINDOWS_TICKS = 11644473600;
    const TICKS_PER_SECOND = 1e7;
    let timestamp = Date.now() / 1e3;
    timestamp += WINDOWS_TICKS;
    timestamp -= timestamp % 300;
    timestamp *= TICKS_PER_SECOND;
    const strToHash = Math.floor(timestamp).toString() + this.apiToken;
    const hash = crypto.createHash("sha256").update(strToHash, "ascii").digest("hex");
    return hash.toUpperCase();
  }
  async voice_list() {
    if (this.voiceCache) {
      return this.voiceCache;
    }
    console.log("[VoicerTool] Mengambil daftar suara...");
    try {
      const response = await axios.get(this.voicesUrl, {
        headers: {
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
          Referer: "https://voicertool.com/",
          "Accept-Language": "id-ID",
          "sec-ch-ua-mobile": "?1",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      this.voiceCache = response.data;
      console.log(`[VoicerTool] Berhasil mengambil daftar suara`);
      return this.voiceCache;
    } catch (error) {
      console.error(`[VoicerTool] Gagal mengambil daftar suara: ${error.message}`);
      throw error;
    }
  }
  async findVoice(voiceInput) {
    if (!voiceInput) {
      return "en-US-AvaMultilingualNeural";
    }
    const voices = await this.voice_list();
    const inputLower = voiceInput.toLowerCase().trim();
    for (const [locale, data] of Object.entries(voices)) {
      if (data.voices && Array.isArray(data.voices)) {
        const found = data.voices.find(v => {
          if (v.value && v.value.toLowerCase() === inputLower) return true;
          if (v.name && v.name.toLowerCase() === inputLower) return true;
          return false;
        });
        if (found) {
          console.log(`[VoicerTool] Voice ditemukan: "${voiceInput}" -> "${found.value}"`);
          return found.value;
        }
      }
    }
    console.warn(`[VoicerTool] Voice "${voiceInput}" tidak ditemukan, menggunakan input mentah`);
    return voiceInput;
  }
  createSSML(text, voice, rate = "+0%", pitch = "+0Hz", volume = "+0%", style = "") {
    let content = text;
    if (rate !== "+0%" || pitch !== "+0Hz" || volume !== "+0%") {
      content = `<prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${content}</prosody>`;
    }
    if (style) {
      content = `<mstts:express-as style="${style}">${content}</mstts:express-as>`;
    }
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
      <voice name="${voice}">
        ${content}
      </voice>
    </speak>`;
  }
  async generate({
    text,
    voice,
    rate,
    pitch,
    volume,
    style
  }) {
    const selectedVoice = await this.findVoice(voice);
    const connectionId = this.generateUUID();
    const secMsGec = await this.generateSecMsGec();
    console.log(`[VoicerTool] Membuat audio... Voice: ${selectedVoice}`);
    const wsUrl = `${this.wssUrl}?ConnectionId=${connectionId}&TrustedClientToken=${this.apiToken}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${this.secMsGecVersion}`;
    return new Promise((resolve, reject) => {
      const audioChunks = [];
      const metadata = [];
      const ws = new WebSocket(wsUrl, {
        headers: {
          Pragma: "no-cache",
          Origin: "https://voicertool.com",
          "Accept-Language": "id-ID",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          Upgrade: "websocket",
          "Cache-Control": "no-cache",
          Connection: "Upgrade"
        }
      });
      ws.on("open", () => {
        const timestamp = new Date().toString();
        const configHeader = {
          "Content-Type": "application/json; charset=utf-8",
          Path: "speech.config",
          "X-Timestamp": timestamp
        };
        const configContent = JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: false,
                  wordBoundaryEnabled: true
                },
                outputFormat: "audio-24khz-96kbitrate-mono-mp3"
              }
            }
          }
        });
        const configMessage = Object.entries(configHeader).map(([k, v]) => `${k}:${v}`).join("\r\n") + "\r\n\r\n" + configContent;
        ws.send(configMessage);
        const ssml = this.createSSML(text, selectedVoice, rate, pitch, volume, style);
        const ssmlHeader = {
          "Content-Type": "application/ssml+xml",
          Path: "ssml",
          "X-RequestId": connectionId,
          "X-Timestamp": timestamp
        };
        const ssmlMessage = Object.entries(ssmlHeader).map(([k, v]) => `${k}:${v}`).join("\r\n") + "\r\n\r\n" + ssml;
        ws.send(ssmlMessage);
      });
      ws.on("message", (data, isBinary) => {
        if (isBinary || data instanceof Buffer) {
          const headerLength = data.readUInt16BE(0);
          const headerStr = data.subarray(2, headerLength + 2).toString();
          if (headerStr.includes("Path:audio")) {
            audioChunks.push(data.subarray(headerLength + 2));
          }
        } else {
          const message = data.toString();
          if (message.includes("Path:audio.metadata")) {
            try {
              const jsonStart = message.indexOf("{");
              if (jsonStart !== -1) {
                const jsonData = JSON.parse(message.substring(jsonStart));
                if (jsonData.Metadata) {
                  metadata.push(...jsonData.Metadata);
                }
              }
            } catch (e) {}
          }
          if (message.includes("Path:turn.end")) {
            ws.close();
          }
        }
      });
      ws.on("close", () => {
        if (audioChunks.length > 0) {
          resolve({
            audio: Buffer.concat(audioChunks),
            metadata: metadata
          });
        } else {
          reject(new Error("Tidak ada audio yang diterima"));
        }
      });
      ws.on("error", err => {
        console.error("[VoicerTool] WebSocket error:", err);
        reject(err);
      });
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
      error: "Parameter 'action' wajib diisi (voice_list/generate)"
    });
  }
  const api = new VoicerTool();
  try {
    switch (action) {
      case "voice_list":
        const voices = await api.voice_list();
        return res.status(200).json(voices);
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi"
          });
        }
        const result = await api.generate(params);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", 'inline; filename="voicertool.mp3"');
        if (params.includeMetadata) {
          res.setHeader("Content-Type", "application/json");
          return res.status(200).json({
            audio: result.audio.toString("base64"),
            metadata: result.metadata
          });
        }
        return res.status(200).send(result.audio);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`
        });
    }
  } catch (error) {
    console.error(`[VoicerTool] Error pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}