import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class MusicGenerator {
  constructor() {
    this.baseURL = "https://www.aimakesong.com";
    this.generateURL = `${this.baseURL}/api/music/generate`;
    this.statusURL = `${this.baseURL}/api/music/status`;
    this.maxPromptLength = 200;
    this.defaultLang = "en";
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
        Referer: `${this.baseURL}/`,
        ...SpoofHead()
      }
    });
  }
  async generate({
    type = "description",
    instrument = false,
    title = "Epic Orchestral Score",
    prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    style = "orchestral, cinematic, epic",
    version = "2.0",
    lang = "en"
  }) {
    try {
      const currentLang = lang || this.defaultLang;
      const isDescription = type === "description";
      const processedPrompt = isDescription ? currentLang === "zh" ? `来一首关于：${prompt}的歌曲，我对歌曲的风格要求是${style}` : ` ${prompt}\n          Musical Style: ${style}` : prompt?.substring(0, this.maxPromptLength) || "";
      const styleArray = style?.split(",").map(s => s.trim()).filter(s => s !== "") || [];
      const versionArray = version?.split(",").map(v => v.trim()).filter(v => v !== "") || [];
      const payload = {
        inputType: isDescription ? "10" : "20",
        makeInstrumental: instrument?.toString() || "false",
        title: title,
        continueClipId: "",
        continueAt: "",
        mvVersion: versionArray?.includes("2.0") ? "chirp-v4-5" : "chirp-v4",
        callbackUrl: "",
        ...isDescription ? {
          gptDescriptionPrompt: processedPrompt
        } : {
          prompt: processedPrompt,
          tags: styleArray.join(",")
        }
      };
      const {
        data
      } = await this.axiosInstance.post(this.generateURL, payload);
      if (data?.code === 200) return data;
      console.error("Gagal membuat musik:", data);
      throw new Error(data?.msg || "Gagal membuat musik.");
    } catch (error) {
      console.error("Error membuat musik:", error);
      return null;
    }
  }
  async getTask({
    taskId: id
  }) {
    if (!id) {
      console.warn("Task ID tidak valid.");
      return null;
    }
    try {
      const {
        data
      } = await this.axiosInstance.get(`${this.statusURL}?taskBatchId=${id}`);
      return data;
    } catch (error) {
      console.error(`Gagal mengambil detail tugas dengan ID ${id}:`, error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const musicGenerator = new MusicGenerator();
  switch (action) {
    case "create":
      if (!params.prompt) {
        return res.status(400).json({
          message: "No prompt provided"
        });
      }
      try {
        const song = await musicGenerator.generate(params);
        if (!song) return res.status(500).json({
          error: "Gagal membuat lagu"
        });
        return res.status(200).json(song);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    case "status":
      if (!params.taskId) {
        return res.status(400).json({
          message: "No taskId provided"
        });
      }
      try {
        const musicStatus = await musicGenerator.getTask(params);
        if (!musicStatus) return res.status(500).json({
          error: "Gagal mengambil daftar lagu"
        });
        return res.status(200).json(musicStatus);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    default:
      return res.status(400).json({
        error: "Action tidak valid. Gunakan ?action=create atau ?action=status"
      });
  }
}