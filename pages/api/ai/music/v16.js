import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
const GC = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const YC = (e = 21) => {
  let t = "";
  const r = crypto.getRandomValues(new Uint8Array(e |= 0));
  for (; e--;) t += GC[r[e] & 63];
  return t;
};
class VozartApi {
  constructor() {
    this.xTempSession = YC(12);
    this.axiosInstance = axios.create({
      baseURL: "https://vozart.ai/api",
      headers: {
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9",
        Authorization: "Bearer null",
        "Content-Type": "application/json",
        Origin: "https://vozart.ai",
        Referer: "https://vozart.ai/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "x-temp-session": this.xTempSession,
        ...SpoofHead()
      }
    });
  }
  async lyrics({
    prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    lang = "English",
    ...rest
  } = {}) {
    console.log(`Submitting request for lyrics with prompt: "${prompt}"`);
    const payload = {
      model: "text-to-lyrics-custom",
      params: {
        prompt: prompt,
        lang: lang
      },
      attachments: rest.attachments || [],
      showPublic: rest.showPublic || 0
    };
    try {
      const response = await this.axiosInstance.post("/tools/text-to-lyrics/submit", payload);
      console.log("Lyrics generation task submitted successfully.");
      return {
        task_id: this.xTempSession,
        ...response.data
      };
    } catch (error) {
      console.error("Error submitting lyrics generation task:", error.response?.data || error.message);
      throw error;
    }
  }
  async create({
    lyrics = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    prompt = "A dramatic and dark song about a mysterious place.",
    instrumental = false,
    title = "Echoes of the Abyss",
    tags = "male vocal, dark, dramatic, electric guitar, synthesizer, male lead",
    negativeTags = "hd",
    public: isPublic = true,
    lang = "en",
    ...rest
  } = {}) {
    console.log("Submitting request to create music...");
    const payload = {
      model: "chirp-v4",
      params: {
        customMode: true,
        model: "chirp-v4",
        lyrics: lyrics,
        prompt: prompt,
        instrumental: instrumental,
        title: title,
        tags: tags,
        negativeTags: negativeTags,
        public: isPublic,
        lang: lang
      },
      attachments: rest.attachments || [],
      showPublic: rest.showPublic || 0
    };
    try {
      const response = await this.axiosInstance.post("/tools/audio-text-to-music/submit", payload);
      console.log("Music creation task submitted successfully.");
      return {
        task_id: this.xTempSession,
        ...response.data
      };
    } catch (error) {
      console.error("Error submitting music creation task:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    task_id = "",
    tool = "audio-text-to-music",
    page = 1,
    ...rest
  } = {}) {
    console.log(`Fetching usage status for tool: '${tool}' on page ${page}`);
    try {
      const headers = {
        ...this.axiosInstance.defaults.headers,
        "x-temp-session": task_id || this.xTempSession
      };
      const response = await this.axiosInstance.get(`/tools/usage?page=${page}&tool=${tool}`, {
        headers: headers
      });
      console.log("Usage status fetched successfully.");
      return {
        task_id: task_id,
        ...response.data
      };
    } catch (error) {
      console.error("Error fetching usage status:", error.response?.data || error.message);
      throw error;
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
      error: "Action (create or status) is required."
    });
  }
  const generator = new VozartApi();
  try {
    switch (action) {
      case "create":
        if (!params.lyrics) {
          return res.status(400).json({
            error: "lyrics is required for 'create' action."
          });
        }
        const createResponse = await generator.create(params);
        return res.status(200).json(createResponse);
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            error: "prompt is required for 'lyrics' action."
          });
        }
        const lyricsResponse = await generator.lyrics(params);
        return res.status(200).json(lyricsResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await generator.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}