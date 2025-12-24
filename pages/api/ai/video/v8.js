import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class Veo5VideoGenerator {
  constructor() {
    this.availableRatios = ["16:9", "9:16", "1:1", "4:3", "3:4"];
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
    prompt,
    aspectRatio = "16:9",
    ...rest
  }) {
    try {
      if (!prompt) throw new Error("Prompt is required");
      if (!this.availableRatios.includes(aspectRatio)) {
        throw new Error(`Available ratios: ${this.availableRatios.join(", ")}`);
      }
      const videoId = `video_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
      const options = {
        prompt: prompt,
        aspectRatio: aspectRatio,
        videoId: videoId,
        ...rest
      };
      const {
        data
      } = await axios.post("https://veo5.org/api/generate", options, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://veo5.org",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://veo5.org/create",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      if (!data.success) {
        throw new Error(data.message || "Failed to initiate video generation.");
      }
      const task_id = await this.enc({
        videoId: data.videoId
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("Error in Veo5 generate:", error.message);
      throw new Error(`Failed to generate video with Veo5: ${error.message}`);
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        videoId
      } = decryptedData;
      if (!videoId) {
        throw new Error("Invalid task_id: Missing videoId after decryption.");
      }
      const {
        data
      } = await axios.get(`https://veo5.org/api/webhook?videoId=${videoId}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://veo5.org/create",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      if (data.status === "completed") {
        return {
          status: "success",
          videoUrl: data.videoUrl,
          metadata: data.metadata
        };
      } else if (data.status === "pending" || data.status === "processing") {
        return {
          status: "processing",
          message: "Video is still being processed."
        };
      } else {
        return {
          status: data.status,
          message: data.error || "Video status is unknown or failed.",
          rawData: data
        };
      }
    } catch (error) {
      console.error("Error in Veo5 status check:", error.message);
      throw new Error(`Failed to check video status with Veo5: ${error.message}`);
    }
  }
  getAvailableRatios() {
    return this.availableRatios;
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
  const veo5Gen = new Veo5VideoGenerator();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await veo5Gen.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await veo5Gen.status(params);
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