import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class AiMusicScraper {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.chatgptweb.online/api",
      timeout: 3e4
    });
    this.baseHeaders = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
      Origin: "https://api.chatgptweb.online",
      ...SpoofHead()
    };
    this.appInfo = {
      packageName: "com.kmatrix.ai.music.suno.generator.v2",
      versionCode: "7"
    };
    console.log("AiMusicScraper initialized with robust headers.");
  }
  _createSign(timestamp) {
    const userAgent = this.baseHeaders["User-Agent"];
    const stringToHash = `musicapp${timestamp}${userAgent}`;
    return crypto.createHash("md5").update(stringToHash).digest("hex").toLowerCase();
  }
  _createDeviceId() {
    try {
      const uniqueData = [process.platform, process.arch, Date.now()].join("|");
      return crypto.createHash("sha1").update(uniqueData).digest("hex").toUpperCase();
    } catch {
      return crypto.randomUUID().replace(/-/g, "").toUpperCase();
    }
  }
  _buildHeaders() {
    const timestamp = Math.floor(Date.now() / 1e3);
    return {
      ...this.baseHeaders,
      ts: `${timestamp}`,
      sign: this._createSign(timestamp),
      deviceId: this._createDeviceId(),
      appVersion: this.appInfo.versionCode,
      pkgName: this.appInfo.packageName,
      app: "music",
      paid: "true"
    };
  }
  async generate(opts = {}) {
    console.log("LOG: Sending music generation request...");
    const {
      custom = false,
        prompt = "",
        lyric = "",
        title,
        instrumental,
        dual
    } = opts;
    if (custom && !lyric.trim() || !custom && !prompt.trim()) {
      const error = custom ? "Lyric is required for custom mode." : "Prompt is required.";
      console.error(`Error: ${error}`);
      return {
        success: false,
        code: 400,
        result: {
          error: error
        }
      };
    }
    try {
      const payload = {
        action: "generate",
        custom: custom,
        prompt: custom ? `Compose a song from these lyrics:\n\n${lyric}` : prompt,
        ...title && {
          title: title
        },
        ...typeof instrumental === "boolean" && {
          instrumental: instrumental
        },
        ...typeof dual === "boolean" && {
          is_dual_song: dual
        }
      };
      const {
        data
      } = await this.client.post("/music/generate", payload, {
        headers: this._buildHeaders()
      });
      if (data.code !== 200) {
        throw new Error(data.message || `API returned non-200 status: ${data.code}`);
      }
      const taskId = data?.data?.taskId;
      console.log(`LOG: Request successful. Task ID: ${taskId}`);
      return {
        success: true,
        code: 200,
        result: {
          taskId: taskId,
          interval: data?.data?.interval || 5
        }
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      const errorCode = error.response?.status || 500;
      console.error(`\nError during creation: ${errorMessage} (Code: ${errorCode})`);
      return {
        success: false,
        code: errorCode,
        result: {
          error: errorMessage
        }
      };
    }
  }
  async status(opts = {}) {
    const {
      task_id
    } = opts;
    if (!task_id) {
      const error = "Task ID is required for status check.";
      console.error(`Error: ${error}`);
      return {
        success: false,
        code: 400,
        result: {
          error: error
        }
      };
    }
    try {
      const {
        data
      } = await this.client.get(`/music/task/${task_id}`, {
        headers: this._buildHeaders()
      });
      if (data.code !== 200) {
        throw new Error(data.message || `API returned non-200 status: ${data.code}`);
      }
      const songs = data?.data || [];
      const isReady = songs.length > 0 && songs.every(s => s?.audio_url);
      return {
        success: true,
        code: 200,
        result: {
          status: isReady ? "completed" : "processing",
          songs: songs
        }
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      const errorCode = error.response?.status || 500;
      console.error(`\nError checking status: ${errorMessage} (Code: ${errorCode})`);
      return {
        success: false,
        code: errorCode,
        result: {
          error: errorMessage
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
      error: "Action (create or status) is required."
    });
  }
  const api = new AiMusicScraper();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await api.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await api.status(params);
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