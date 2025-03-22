import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class MusicAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://lyricsintosong.ai/api/",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        origin: "https://lyricsintosong.ai",
        referer: "https://lyricsintosong.ai/"
      },
      jar: this.jar,
      withCredentials: true
    }));
  }
  async getMusicDetail(id) {
    try {
      const res = await this.client.get(`music-detail/${id}`);
      return res.data ?? null;
    } catch (err) {
      console.error("Error fetching music detail:", err);
      return null;
    }
  }
  async getMusicsByTask(taskId) {
    try {
      const res = await this.client.get(`musics-by-taskId/${taskId}`);
      return res.data ?? null;
    } catch (err) {
      console.error("Error fetching musics by task ID:", err);
      return null;
    }
  }
  async getRandomLyrics() {
    try {
      const res = await this.client.post("random-lyrics");
      return res.data ?? null;
    } catch (err) {
      console.error("Error fetching random lyrics:", err);
      return null;
    }
  }
  async generateMusic({
    style = "pop",
    prompt = "",
    title = "New Song",
    customMode = false,
    instrumental = false,
    isPrivate = false
  }) {
    try {
      const res = await this.client.post("generate", {
        style: style,
        prompt: prompt,
        title: title,
        customMode: customMode,
        instrumental: instrumental,
        isPrivate: isPrivate,
        action: "generate"
      });
      return res.data ?? null;
    } catch (err) {
      console.error("Error generating music:", err);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const music = new MusicAPI();
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            message: "No prompt provided"
          });
        }
        result = await music.generateMusic(params);
        break;
      case "task":
        result = await music.getMusicsByTask(params.taskId);
        break;
      case "info":
        result = await music.getMusicDetail(params.id);
        break;
      case "lyrics":
        result = await music.getRandomLyrics();
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}