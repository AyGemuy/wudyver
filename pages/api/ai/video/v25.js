import axios from "axios";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class VeoAPI {
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
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Starting generate");
      const body = {
        videoPrompt: prompt ?? "",
        videoAspectRatio: rest.ratio || "16:9",
        videoDuration: rest.duration || 5,
        videoQuality: rest.quality || "540p",
        videoModel: rest.model || "v4.5",
        videoPublic: rest.is_public ?? false,
        videoImageUrl: imageUrl ?? ""
      };
      const res = await axios.post("https://veo31ai.io/api/pixverse-token/gen", body, {
        headers: this.h()
      });
      console.log("Generate done");
      const task_id = await this.enc({
        taskId: res?.data?.taskId,
        is_public: rest.is_public ?? false,
        quality: rest.quality || "540p",
        ratio: rest.ratio || "16:9",
        prompt: prompt || ""
      });
      return {
        task_id: task_id
      };
    } catch (e) {
      console.log("Generate error:", e?.message || e);
      throw e;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    try {
      console.log("Starting status");
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        taskId,
        is_public,
        quality,
        ratio,
        prompt
      } = decryptedData;
      if (!taskId) {
        throw new Error("Invalid task_id: Missing required data after decryption.");
      }
      const body = {
        taskId: taskId ?? 0,
        videoPublic: is_public ?? false,
        videoQuality: quality || "540p",
        videoAspectRatio: ratio || "16:9",
        videoPrompt: prompt || ""
      };
      const res = await axios.post("https://veo31ai.io/api/pixverse-token/get", body, {
        headers: this.h()
      });
      console.log("Status done");
      return res?.data || {};
    } catch (e) {
      console.log("Status error:", e?.message || e);
      throw e;
    }
  }
  h() {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://veo31ai.io",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://veo31ai.io/dashboard",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const api = new VeoAPI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for generate."
          });
        }
        response = await api.generate(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'generate', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}