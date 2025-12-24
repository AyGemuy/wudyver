import axios from "axios";
class Piapi {
  constructor() {
    this.xApiKey = "d3a513bec58ea7c7e60eebf377fbbfb806f2304f12e1ef208cd701139658c088";
    this.axiosInstance = axios.create({
      baseURL: "https://api.piapi.ai/api/v1",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://www.musicgenai.app",
        priority: "u=1, i",
        referer: "https://www.musicgenai.app/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        "x-api-key": this.xApiKey
      }
    });
    this.models = {
      suno: "suno",
      suno3: "suno-v3",
      suno35: "suno-v3.5",
      suno4: "suno-v4",
      suno45: "suno-v4.5",
      udio: "udio",
      diffrhythm: "Qubico/diffrhythm",
      aceStep: "ace-step",
      mmaudio: "mmaudio",
      musicU: "music-u",
      musicS: "music-s",
      lyricsAI: "lyrics-ai",
      f5TTS: "f5-tts"
    };
  }
  models() {
    return this.models;
  }
  async create({
    model = "suno-v4.5",
    gpt_description_prompt = "pop, rock",
    negative_tags = "",
    lyrics_type = "user",
    seed = -1,
    lyrics = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    service_mode = "public",
    ...rest
  } = {}) {
    console.log(`Submitting request to generate music with prompt: "${gpt_description_prompt}"`);
    const payload = {
      model: model,
      task_type: "generate_music",
      input: {
        gpt_description_prompt: gpt_description_prompt,
        negative_tags: negative_tags,
        lyrics_type: lyrics_type,
        seed: seed,
        lyrics: lyrics
      },
      config: {
        service_mode: service_mode,
        webhook_config: {
          endpoint: "",
          secret: ""
        }
      },
      ...rest
    };
    try {
      const response = await this.axiosInstance.post("/task", payload);
      console.log("Music generation task submitted successfully.");
      return response.data;
    } catch (error) {
      console.error("Error submitting music generation task:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) {
      throw new Error("task_id is required to check status");
    }
    console.log(`Checking status for task: ${task_id}`);
    try {
      const response = await this.axiosInstance.get(`/task/${task_id}`);
      console.log("Task status fetched successfully.");
      return response.data;
    } catch (error) {
      console.error("Error fetching task status:", error.response?.data || error.message);
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
  const generator = new Piapi();
  try {
    switch (action) {
      case "create":
        if (!params.lyrics) {
          return res.status(400).json({
            error: "lyrics is required for 'status' action."
          });
        }
        const createResponse = await generator.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await generator.status(params);
        return res.status(200).json(statusResponse);
      case "models":
        const modelsResponse = await generator.models();
        return res.status(200).json(modelsResponse);
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