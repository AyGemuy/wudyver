import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class LyricsToSong {
  constructor() {
    this.baseUrl = "https://musicgeneratorai.com/api";
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios);
    this.axiosInstance.defaults.jar = this.cookieJar;
    this.axiosInstance.defaults.withCredentials = true;
  }
  async create({
    style = "pop, pop",
    prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    title = "Echoes of Yesterday",
    customMode = true,
    instrumental = false,
    isPrivate = false
  }) {
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
      const response = await this.axiosInstance.post(`${this.baseUrl}/generate`, payload);
      if (response.data.status === 0) {
        return {
          task_id: response.data.data
        };
      } else {
        throw new Error(response.data.message || "Failed to generate song");
      }
    } catch (error) {
      console.error("Error generating song:", error.response?.data || error.message);
      throw new Error("Failed to generate song");
    }
  }
  async status({
    task_id = "40b419fd-716d-4630-857e-39c6b361889d"
  } = {}) {
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/musics-by-taskId/${task_id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching music by Task ID:", error.response?.data || error.message);
      throw new Error("Failed to fetch music");
    }
  }
  async detail({
    music_id = "dd002d50-f99c-4e0c-b4cc-5aaed6127675"
  } = {}) {
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/music-detail/${music_id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching music details:", error.response?.data || error.message);
      throw new Error("Failed to fetch music details");
    }
  }
  async getRandomLyrics() {
    try {
      const response = await this.axiosInstance.post(`${this.baseUrl}/random-lyrics`, {});
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
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            message: "No task_id provided"
          });
        }
        result = await lyricsToSong.status(params);
        break;
      case "detail":
        if (!params.music_id) {
          return res.status(400).json({
            message: "No music_id provided"
          });
        }
        result = await lyricsToSong.detail(params);
        break;
      case "lyrics":
        result = await lyricsToSong.getRandomLyrics();
        break;
      default:
        return res.status(400).json({
          error: "Action tidak valid. Gunakan ?action=create atau ?action=status"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}