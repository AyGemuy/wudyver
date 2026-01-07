import axios from "axios";
class VoiceAIService {
  constructor() {
    this.BASE_URL = "https://us-central1-play-voice-ai.cloudfunctions.net";
    this.apiKey = "AIzaSyCljTpkdxKR0B-rFEAivTQJnlcpuldH2R8";
    this.token = null;
  }
  async getToken() {
    try {
      if (this.token) return this.token;
      console.log("🔑 [Auth] Requesting token...");
      const res = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.apiKey}`, {
        clientType: "CLIENT_TYPE_ANDROID"
      });
      this.token = res.data.idToken;
      return this.token;
    } catch (e) {
      console.error("❌ [Auth] Failed:", e.response?.data || e.message);
      throw e;
    }
  }
  async voice_list({
    token = null
  } = {}) {
    try {
      console.log("🌐 [List] Fetching voices...");
      const auth = token || await this.getToken();
      const res = await axios.get(`${this.BASE_URL}/proxyGetVoices`, {
        headers: {
          Authorization: `Bearer ${auth}`
        }
      });
      const voices = (res.data.voices || []).map(v => {
        const parts = v.id.split("/");
        const rawId = parts.slice(-3, -1).join("/");
        return {
          ...v,
          voice_id: rawId
        };
      });
      console.log(`✅ [List] Loaded ${voices.length} voices`);
      return {
        voices: voices
      };
    } catch (e) {
      console.error("❌ [List] Error:", e.message);
      return [];
    }
  }
  async generate({
    token = null,
    text,
    voice_id = "40738a3a-34bb-4ac3-97c5-aed7b31ccf1d/chucksaad",
    speed = 1
  }) {
    try {
      const rawId = voice_id;
      if (!rawId) throw new Error("Invalid Voice ID");
      console.log(`🎤 [Gen] Starting: ${rawId}`);
      const auth = token || await this.getToken();
      const res = await axios.post(`${this.BASE_URL}/proxyTextToSpeech`, {
        text: text,
        speed: speed,
        voice_id: `s3://voice-cloning-zero-shot/${rawId}/manifest.json`
      }, {
        headers: {
          Authorization: `Bearer ${auth}`
        },
        responseType: "arraybuffer"
      });
      const contentType = res.headers["content-type"];
      const contentLength = res.headers["content-length"];
      console.log("✅ [Gen] Audio generated successfully");
      return {
        audio: res.data,
        contentType: contentType || "audio/mpeg"
      };
    } catch (e) {
      console.error("❌ [Gen] Error:", e.message);
      throw e;
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
      error: "Parameter 'action' wajib diisi.",
      action: ["voice_list", "generate"]
    });
  }
  const api = new VoiceAIService();
  try {
    switch (action) {
      case "voice_list":
        const voices = await api.voice_list(params);
        return res.status(200).json(voices);
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi"
          });
        }
        const result = await api.generate(params);
        res.setHeader("Content-Type", result.contentType);
        res.setHeader("Content-Disposition", 'inline; filename="play-voice-ai.mp3"');
        return res.status(200).send(result.audio);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          action: ["voice_list", "generate"]
        });
    }
  } catch (error) {
    console.error(`[Gen] Error pada action '${action}':`, error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}