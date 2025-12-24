import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class MusicAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://aimusiclab.co/api",
      jar: this.jar,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
        Referer: "https://aimusiclab.co/id/create",
        ...SpoofHead()
      }
    }));
  }
  async createMusic({
    prompt,
    isLyricsMode = true,
    isInstrumental = false,
    email = "",
    songStyle = "pop",
    title = "Whispers of Forgotten Dreams",
    language = "auto",
    target_language = null,
    mode = "custom"
  }) {
    const data = {
      prompt: prompt || `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
      isLyricsMode: isLyricsMode,
      isInstrumental: isInstrumental,
      email: email,
      songStyle: songStyle,
      title: title,
      language: language,
      target_language: target_language,
      mode: mode
    };
    try {
      const response = await this.client.post("/musicmake5", data);
      return response.data;
    } catch (error) {
      console.error("Error creating music:", error);
      throw error;
    }
  }
  async refreshTask({
    taskId
  }) {
    try {
      const response = await this.client.get("/refresh", {
        params: {
          task_id: taskId
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error refreshing task:", error);
      throw error;
    }
  }
  async getTheme() {
    try {
      const response = await this.client.get("/theme");
      return response.data;
    } catch (error) {
      console.error("Error getting theme:", error);
      throw error;
    }
  }
  async getLyrics(prompt) {
    try {
      const response = await this.client.post("/lyrics", {
        prompt: prompt
      });
      return response.data;
    } catch (error) {
      console.error("Error getting lyrics:", error);
      throw error;
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
        result = await music.createMusic(params);
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            message: "No taskId provided"
          });
        }
        result = await music.refreshTask(params);
        break;
      case "theme":
        result = await music.getTheme();
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            message: "No prompt provided"
          });
        }
        result = await music.getLyrics(params.prompt);
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