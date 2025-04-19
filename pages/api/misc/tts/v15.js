import WebSocket from "ws";
import axios from "axios";
class UmaVoiceSynth {
  constructor() {
    this.sessionHash = `${Math.random().toString(36).substring(2, 12)}`;
    this.baseUrl = "tioss-vits-umamusume-voice-synthesizer.hf.space";
    this.ws = null;
    this.text = "";
    this.voice = "";
    this.lang = "日本語";
    this.speed = 1;
    this.resolve = null;
    this.reject = null;
  }
  async list() {
    try {
      const response = await axios.get(`https://${this.baseUrl}`);
      const match = response.data.match(/window\.gradio_config = ({.*?});/s);
      if (match && match[1]) {
        const config = JSON.parse(match[1]);
        const components = config.components;
        const voice1 = components.find(item => item.id === 16)?.props?.choices;
        const lang1 = components.find(item => item.id === 17)?.props?.choices;
        const voice2 = components.find(item => item.id === 38)?.props?.choices;
        const lang2 = components.find(item => item.id === 39)?.props?.choices;
        const voices = [voice1, voice2].filter(v => v).sort();
        const langs = [lang1, lang2].filter(l => l).sort();
        const indexedVoices = voices.map((voice, index) => ({
          index: index,
          voice: voice
        }));
        const indexedLangs = langs.map((lang, index) => ({
          index: index,
          lang: lang
        }));
        return {
          voice: indexedVoices,
          lang: indexedLangs
        };
      }
      throw new Error("window.gradio_config tidak ditemukan");
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async create({
    text = "こんにちわ。",
    voice = "派蒙 Paimon (Genshin Impact)",
    lang = "日本語",
    speed = 1
  }) {
    this.text = text;
    this.voice = voice;
    this.lang = lang;
    this.speed = speed;
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      try {
        console.log("[Synth] Connecting to WebSocket...");
        this.ws = new WebSocket(`wss://${this.baseUrl}/queue/join`, {
          headers: {
            Origin: `https://${this.baseUrl}`,
            "Cache-Control": "no-cache",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            Pragma: "no-cache",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
          }
        });
        this.ws.on("open", () => {
          console.log("[Synth] WebSocket connection opened.");
        });
        this.ws.on("error", err => {
          console.error("[Synth] WebSocket error:", err);
          reject(err);
        });
        this.ws.on("close", () => {
          console.log("[Synth] WebSocket connection closed.");
        });
        this.ws.on("message", data => this.handleMessage(data));
      } catch (error) {
        console.error("[Synth] Unexpected error:", error);
        reject(error);
      }
    });
  }
  handleMessage(raw) {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.msg === "send_hash") {
        console.log("[Synth] Sending session_hash...");
        this.ws.send(JSON.stringify({
          session_hash: this.sessionHash,
          fn_index: 2
        }));
      } else if (msg.msg === "send_data") {
        console.log("[Synth] Sending voice data...");
        this.ws.send(JSON.stringify({
          fn_index: 2,
          data: [this.text, this.voice, this.lang, this.speed, false],
          session_hash: this.sessionHash
        }));
      } else if (msg.msg === "process_completed") {
        console.log("[Synth] Processing complete.");
        this.ws.close();
        const fileUrl = `https://${this.baseUrl}/file=${msg.output.data[1].name}`;
        this.resolve({
          url: fileUrl
        });
      } else {
        console.log("[Synth] Received unknown message:", msg);
      }
    } catch (err) {
      console.error("[Synth] Error handling message:", err);
      this.reject(err);
      if (this.ws) this.ws.close();
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
        action: "list | create"
      }
    });
  }
  const mic = new UmaVoiceSynth();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action]();
        break;
      case "create":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: list | create`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}