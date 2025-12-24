import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
class SunoAPI {
  constructor() {
    this.baseUrl = "https://api.sunoapi.org/api/v1";
    this.token = apiConfig.SUNOAPI_KEY;
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async generate({
    prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    style = "pop",
    title = "untitled",
    instrumental = false,
    model = "V3_5",
    customMode = true
  }) {
    if (!prompt) throw new Error("Prompt is required.");
    try {
      const res = await axios.post(`${this.baseUrl}/generate`, {
        prompt: prompt,
        style: style,
        title: title,
        instrumental: instrumental,
        model: model,
        customMode: customMode,
        callBackUrl: "playground"
      }, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K)",
          Referer: "https://sunoapi.org/id/playground"
        }
      });
      if (res.data.code !== 200) throw new Error(res.data.msg || "Failed to create task.");
      const task_id = await this.enc({
        token: this.token,
        taskId: res.data.data.taskId
      });
      return {
        task_id: task_id,
        message: "Task created successfully."
      };
    } catch (err) {
      throw new Error(`Generate failed: ${err.message}`);
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) throw new Error("task_id is required.");
    try {
      const {
        token,
        taskId
      } = await this.dec(task_id);
      const res = await axios.get(`${this.baseUrl}/generate/record-info`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K)",
          Referer: "https://sunoapi.org/id/playground"
        },
        params: {
          taskId: taskId
        }
      });
      return res.data;
    } catch (err) {
      throw new Error(`Status check failed: ${err.message}`);
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
  const suno = new SunoAPI();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await suno.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await suno.status(params);
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