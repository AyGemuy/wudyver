import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class AiMu {
  constructor() {
    this.api = {
      base: "https://aimu.1010diy.com",
      endpoint: {
        credits: "/and/getUserActualCredits",
        musicAI: "/music/MusicAI",
        taskStatus: "/music/getTaskStatus",
        generateList: "/and/data/generateList",
        options: "/and/home/index"
      }
    };
    this.sid = null;
  }
  setId(id) {
    console.log("Setting device ID:", id || "null");
    this.sid = id;
  }
  getId() {
    if (!this.sid) {
      this.sid = crypto.randomBytes(8).toString("hex");
      console.log("Generated device ID:", this.sid);
    }
    return this.sid;
  }
  headers() {
    return {
      "user-agent": "NB Android/1.0.0",
      "accept-encoding": "gzip",
      "x-version-code": "27",
      "x-token": "",
      ...SpoofHead()
    };
  }
  async options() {
    console.log("Fetching options...");
    try {
      const res = await axios.get(`${this.api.base}${this.api.endpoint.options}`, {
        headers: {
          ...this.headers(),
          "x-device-id": this.getId()
        }
      });
      const {
        code,
        msg,
        data
      } = res.data || {};
      if (code !== 200) {
        console.log("Options fetch failed:", msg || "Unknown error");
        return {
          success: false,
          code: code ?? 500,
          result: {
            error: msg || "Failed to fetch options"
          }
        };
      }
      const moods = [...data?.mood?.default || [], ...data?.mood?.more || []].map(m => m.text) || [];
      const genres = [...data?.genre?.default || [], ...data?.genre?.more || []].map(g => g.text) || [];
      const voices = ["female", "male", "random"];
      console.log("Options fetched successfully");
      return {
        success: true,
        code: 200,
        result: {
          moods: moods,
          genres: genres,
          voices: voices
        }
      };
    } catch (err) {
      console.error("Error fetching options:", err.message);
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Unknown error"
        }
      };
    }
  }
  async credits() {
    console.log("Fetching credits...");
    try {
      const res = await axios.get(`${this.api.base}${this.api.endpoint.credits}`, {
        headers: {
          ...this.headers(),
          "x-device-id": this.getId()
        }
      });
      const {
        code,
        msg,
        data
      } = res.data || {};
      if (code !== 200) {
        console.log("Credits fetch failed:", msg || "Unknown error");
        return {
          success: false,
          code: code ?? 500,
          result: {
            error: msg || "Failed to fetch credits"
          }
        };
      }
      console.log("Credits fetched successfully");
      return {
        success: true,
        code: 200,
        result: {
          ...data || {}
        }
      };
    } catch (err) {
      console.error("Error fetching credits:", err.message);
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Unknown error"
        }
      };
    }
  }
  async generate({
    ...rest
  }) {
    console.log("Starting generation...", rest);
    const optRes = await this.options();
    if (!optRes.success) {
      console.log("Generation failed: Options fetch error");
      return optRes;
    }
    const {
      moods,
      genres,
      voices
    } = optRes.result;
    const mood = rest.mood ?? null;
    if (mood && !moods.includes(mood)) {
      console.log("Generation failed: Invalid mood");
      return {
        success: false,
        code: 400,
        result: {
          error: `Invalid mood: ${mood}`
        }
      };
    }
    const genre = rest.genre ?? null;
    if (genre && !genres.includes(genre)) {
      console.log("Generation failed: Invalid genre");
      return {
        success: false,
        code: 400,
        result: {
          error: `Invalid genre: ${genre}`
        }
      };
    }
    const voice = rest.voice ?? null;
    if (voice && !voices.includes(voice)) {
      console.log("Generation failed: Invalid voice");
      return {
        success: false,
        code: 400,
        result: {
          error: `Invalid voice: ${voice}`
        }
      };
    }
    const credRes = await this.credits();
    if (!credRes.success) {
      console.log("Generation failed: Credits fetch error");
      return credRes;
    }
    const credits = credRes.result?.credits ?? credRes.result?.actualCredits ?? 0;
    if (credits <= 0) {
      console.log("Generation failed: Insufficient credits");
      return {
        success: false,
        code: 403,
        result: {
          error: "Insufficient credits"
        }
      };
    }
    console.log("Credits check passed:", credits);
    const lyrics = rest.lyrics ?? "";
    const prompt = rest.prompt ?? "";
    if (!lyrics.trim() && !prompt.trim()) {
      console.log("Generation failed: No lyrics or prompt");
      return {
        success: false,
        code: 400,
        result: {
          error: "Provide either lyrics or prompt"
        }
      };
    }
    if (prompt && prompt.length > 1e3) {
      console.log("Generation failed: Prompt too long");
      return {
        success: false,
        code: 400,
        result: {
          error: "Prompt exceeds 1000 characters"
        }
      };
    }
    let make_instrumental = rest.make_instrumental ? 1 : 0;
    let vocal_only = rest.vocal_only ? 1 : 0;
    if (make_instrumental === 1) vocal_only = 0;
    const payload = {
      ...rest,
      make_instrumental: make_instrumental,
      vocal_only: vocal_only,
      lyrics: lyrics,
      prompt: prompt
    };
    try {
      const res = await axios.post(`${this.api.base}${this.api.endpoint.musicAI}`, payload, {
        headers: {
          ...this.headers(),
          "content-type": "application/json",
          "x-device-id": this.getId()
        }
      });
      const {
        code,
        msg,
        data
      } = res.data || {};
      if (code !== 200) {
        console.log("Generation failed:", msg || "Unknown error");
        return {
          success: false,
          code: code ?? 500,
          result: {
            error: msg || "Failed to generate"
          }
        };
      }
      console.log("Generation successful, task ID:", data?.task_id);
      return {
        success: true,
        code: 200,
        result: {
          taskId: data?.task_id ?? null,
          inputType: prompt ? "prompt" : "lyrics",
          inputValue: prompt || lyrics
        }
      };
    } catch (err) {
      console.error("Error in generation:", err.message);
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Unknown error"
        }
      };
    }
  }
  async status({
    task_id,
    input_type,
    input_value,
    ...rest
  }) {
    console.log("Checking status for task ID:", task_id, {
      input_type: input_type,
      input_value: input_value,
      rest: rest
    });
    if (!String(task_id)?.trim()) {
      console.log("Status check failed: Invalid task ID");
      return {
        success: false,
        code: 400,
        result: {
          error: "Task ID is required"
        }
      };
    }
    try {
      const res = await axios.get(`${this.api.base}${this.api.endpoint.taskStatus}`, {
        params: {
          task_id: task_id
        },
        headers: {
          ...this.headers(),
          "x-device-id": this.getId()
        }
      });
      const {
        code,
        msg,
        data
      } = res.data || {};
      if (code !== 200) {
        console.log("Status check failed:", msg || "Unknown error");
        return {
          success: false,
          code: code ?? 500,
          result: {
            error: msg || "Failed to check status"
          }
        };
      }
      const statusVal = data?.status ?? "unknown";
      console.log("Status checked successfully:", statusVal);
      if (statusVal !== "complete") {
        return {
          success: true,
          code: 200,
          result: {
            status: statusVal
          }
        };
      }
      const listRes = await this.list();
      if (!listRes.success) {
        console.log("List fetch failed during status");
        return {
          success: true,
          code: 200,
          result: {
            status: statusVal
          }
        };
      }
      const tracks = listRes.result.results.filter(r => String(r.taskId) === String(task_id) && (r.mp3?.includes("vocal-remover.s3.us-west-2.amazonaws.com") ?? false));
      console.log("Tracks filtered:", tracks.length);
      return {
        success: true,
        code: 200,
        result: {
          status: statusVal,
          taskId: String(task_id),
          count: tracks.length,
          tracks: tracks.map(t => ({
            title: t.title,
            duration: t.duration,
            audio: t.mp3,
            cover: t.cover,
            [input_type ?? "lyrics"]: t.input ?? "",
            created_at: t.created_at,
            updated_at: t.updated_at
          })),
          inputValue: input_value ?? ""
        }
      };
    } catch (err) {
      console.error("Error checking status:", err.message);
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Unknown error"
        }
      };
    }
  }
  async list() {
    console.log("Fetching generate list...");
    try {
      const res = await axios.get(`${this.api.base}${this.api.endpoint.generateList}`, {
        headers: {
          ...this.headers(),
          "x-device-id": this.getId()
        }
      });
      const {
        code,
        msg,
        data
      } = res.data || {};
      if (code !== 200) {
        console.log("List fetch failed:", msg || "Unknown error");
        return {
          success: false,
          code: code ?? 500,
          result: {
            error: msg || "Failed to fetch list"
          }
        };
      }
      const results = (data || []).map(item => ({
        taskId: item.task_id ?? null,
        title: item.title ?? "",
        duration: item.duration ?? 0,
        mp3: item.conversion_path ?? "",
        cover: item.album_cover_path ?? "",
        input: item.lyrics ?? "",
        created_at: item.created_at ?? "",
        updated_at: item.updated_at ?? ""
      }));
      console.log("List fetched successfully, count:", results.length);
      return {
        success: true,
        code: 200,
        result: {
          results: results
        }
      };
    } catch (err) {
      console.error("Error fetching list:", err.message);
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Unknown error"
        }
      };
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AiMu();
  try {
    let response;
    const validActions = ["generate", "status"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: `Action tidak valid: ${action}. Action yang didukung: ${validActions.join(", ")}.`
      });
    }
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi."
          });
        }
        response = await api.status(params);
        break;
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}