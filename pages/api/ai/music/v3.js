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
      baseURL: "https://aimusiclab.co/api",
      jar: this.jar,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
        Referer: "https://aimusiclab.co/id/create"
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
      prompt: prompt || "[Verse]\nIn the echoes of the night so clear\nForgotten dreams whisper in your ear\nMemory's voice like a phantom unseen\nLeading you back to where you've been\n\n[Verse 2]\nStarlight’s dance on the ocean’s edge\nPromises linger on the wind’s pledge\nTime’s a thief with a gentle touch\nTakes your heart but leaves a crutch\n\n[Chorus]\nWhispers of forgotten dreams\nIn the night they weave their schemes\nHold on tight to what remains\nCatch the echoes in your veins\n\n[Verse 3]\nMoonlight’s glow on the empty street\nLonely paths where hopes and shadows meet\nSilhouette traces a story untold\nIn midnight’s arms secrets unfold\n\n[Chorus]\nWhispers of forgotten dreams\nIn the night they weave their schemes\nHold on tight to what remains\nCatch the echoes in your veins\n\n[Bridge]\nWhen tomorrow sings a brand new tune\nLet's not forget the dancing moon\nIn every shadow lies a spark\nWhispers alive in the dark",
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