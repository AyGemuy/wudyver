import axios from "axios";
class AISongGenerator {
  constructor() {
    this.apiBaseUrl = "https://aisonggenerator.ai/api";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://aisonggenerator.ai/create",
      Cookie: "_hjSessionUser_5251618=eyJpZCI6ImRjOWQ1OTM1LWMzMWEtNThkOS04ZWZiLTU4ZGE2YWIyN2Q1MSIsImNyZWF0ZWQiOjE3MzU4MDkzMjY1MDksImV4aXN0aW5nIjp0cnVlfQ==; NEXT_LOCALE=en"
    };
  }
  async createSong(data = {}) {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/create-suno-damo`, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || "Gagal membuat lagu");
    }
  }
  async generateLyrics(prompt) {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/lyrics-gpts`, {
        prompt: prompt
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || "Gagal membuat lirik");
    }
  }
  async getMyMusic() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/my-music`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || "Gagal mengambil daftar lagu");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const songAPI = new AISongGenerator();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            message: "No prompt provided"
          });
        }
        result = await songAPI.createSong(params);
        break;
      case "lyrics":
        if (!prompt) throw new Error("Prompt diperlukan untuk generate lirik");
        result = await songAPI.generateLyrics(prompt);
        break;
      case "mymusic":
        result = await songAPI.getMyMusic();
        break;
      default:
        return res.status(400).json({
          error: "Aksi tidak valid. Gunakan action=create, action=lyrics, atau action=mymusic"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}