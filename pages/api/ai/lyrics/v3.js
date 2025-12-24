import axios from "axios";
const API_KEY = "AIzaSyDt9xlxCjO0pslXbFvdbuFmfkjRiMg_vHM";
const BASE = "https://us-central1-music-generate-app.cloudfunctions.net";
class MusicGenerateClient {
  constructor() {
    this.token = null;
    this.uid = null;
    this.tokenExpiry = 0;
  }
  async generateLyrics({
    prompt,
    random = true
  } = {}) {
    try {
      if (!this.token || this.tokenExpiry <= Date.now() + 3e5) {
        const {
          data
        } = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
          returnSecureToken: true
        });
        this.token = data.idToken;
        this.uid = data.localId;
        this.tokenExpiry = Date.now() + (data.expiresIn ? data.expiresIn * 1e3 : 35e5);
      }
      try {
        await axios.post(`${BASE}/createUserAccountCall`, {
          data: {
            id: this.uid,
            platform: "android",
            version: "1.0.0",
            versionCode: 1
          }
        }, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
          }
        });
      } catch (_) {}
      let finalPrompt = prompt;
      if (random) {
        const {
          data
        } = await axios.post(`${BASE}/songRandomPromptGenerationCall`, {
          data: {}
        }, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
          }
        });
        finalPrompt = JSON.parse(data.result).songIdea;
      }
      const {
        data
      } = await axios.post(`${BASE}/generateLyricsCall`, {
        data: {
          user_id: this.uid,
          prompt: finalPrompt
        }
      }, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json"
        }
      });
      return JSON.parse(data.result);
    } catch (error) {
      const msg = error.response?.data || error.message;
      throw new Error(`Generate lyrics gagal: ${JSON.stringify(msg)}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MusicGenerateClient();
  try {
    const data = await api.generateLyrics(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}