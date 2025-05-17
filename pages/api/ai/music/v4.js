import axios from "axios";
class LyricsToSong {
  constructor() {
    this.baseUrl = "https://musicgeneratorai.com/api";
    this.headers = {};
  }
  async setCookies() {
    try {
      const response = await axios.get(this.baseUrl, {
        withCredentials: true
      });
      if (response.headers["set-cookie"]) {
        this.headers["cookie"] = response.headers["set-cookie"].join("; ");
      }
    } catch (error) {
      console.error("Error fetching cookies:", error.message);
    }
  }
  async create({
    style = "pop, pop",
    prompt = "(Verse 1)  \nWhispers through the willow trees,  \nMemories in the evening breeze, ...",
    title = "Echoes of Yesterday",
    customMode = true,
    instrumental = false,
    isPrivate = false
  }) {
    await this.setCookies();
    const payload = {
      style: style,
      prompt: prompt,
      title: title,
      customMode: customMode,
      instrumental: instrumental,
      isPrivate: isPrivate,
      action: "generate"
    };
    try {
      const response = await axios.post(`${this.baseUrl}/generate`, payload, {
        headers: this.headers
      });
      if (response.data.status === 0) {
        return {
          taskId: response.data.data
        };
      } else {
        throw new Error(response.data.message || "Failed to generate song");
      }
    } catch (error) {
      console.error("Error generating song:", error.response?.data || error.message);
      throw new Error("Failed to generate song");
    }
  }
  async check({
    taskId = "40b419fd-716d-4630-857e-39c6b361889d"
  } = {}) {
    await this.setCookies();
    try {
      const response = await axios.get(`${this.baseUrl}/musics-by-taskId/${taskId}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching music by Task ID:", error.response?.data || error.message);
      throw new Error("Failed to fetch music");
    }
  }
  async detail({
    musicId = "dd002d50-f99c-4e0c-b4cc-5aaed6127675"
  } = {}) {
    await this.setCookies();
    try {
      const response = await axios.get(`${this.baseUrl}/music-detail/${musicId}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching music details:", error.response?.data || error.message);
      throw new Error("Failed to fetch music details");
    }
  }
  async getRandomLyrics() {
    await this.setCookies();
    try {
      const response = await axios.post(`${this.baseUrl}/random-lyrics`, {}, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching random lyrics:", error.response?.data || error.message);
      throw new Error("Failed to fetch random lyrics");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const lyricsToSong = new LyricsToSong();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            message: "No prompt provided"
          });
        }
        result = await lyricsToSong.create(params);
        break;
      case "check":
        if (!params.taskId) {
          return res.status(400).json({
            message: "No taskId provided"
          });
        }
        result = await lyricsToSong.check(params);
        break;
      case "detail":
        if (!params.musicId) {
          return res.status(400).json({
            message: "No musicId provided"
          });
        }
        result = await lyricsToSong.detail(params);
        break;
      case "lyrics":
        result = await lyricsToSong.getRandomLyrics();
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}