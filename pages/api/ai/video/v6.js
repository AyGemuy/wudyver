import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
class VeoGenerator {
  constructor() {}
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
    ...rest
  }) {
    try {
      if (!prompt) throw new Error("Prompt is required");
      const {
        data: cf
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          sitekey: "0x4AAAAAAAdJZmNxW54o-Gvd",
          url: "https://lunaai.video/features/v3-fast"
        }
      });
      const uid = crypto.createHash("md5").update(Date.now().toString()).digest("hex");
      const options = {
        imgUrls: [],
        quality: "720p",
        duration: 8,
        autoSoundFlag: false,
        soundPrompt: "",
        autoSpeechFlag: false,
        speechPrompt: "",
        speakerId: "Auto",
        aspectRatio: "16:9",
        secondaryPageId: 1811,
        channel: "VEO3",
        source: "lunaai.video",
        type: "features",
        watermarkFlag: false,
        privateFlag: false,
        isTemp: true,
        vipFlag: false,
        model: "veo-3-fast",
        ...rest
      };
      const {
        data: task
      } = await axios.post("https://aiarticle.erweima.ai/api/v1/secondary-page/api/create", {
        prompt: prompt,
        ...options
      }, {
        headers: {
          uniqueid: uid,
          verify: cf.token
        }
      });
      const task_id = await this.enc({
        uid: uid,
        cfToken: cf.token,
        recordId: task.data.recordId
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      throw new Error(`Failed to initiate video generation: ${error.message}`);
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
        uid,
        cfToken,
        recordId
      } = decryptedData;
      if (!uid || !cfToken || !recordId) {
        throw new Error("Invalid task_id: Missing required data after decryption.");
      }
      const {
        data
      } = await axios.get(`https://aiarticle.erweima.ai/api/v1/secondary-page/api/${recordId}`, {
        headers: {
          uniqueid: uid,
          verify: cfToken
        }
      });
      if (data.data.state === "success") {
        return {
          status: "success",
          result: JSON.parse(data.data.completeData)
        };
      } else if (data.data.state === "processing" || data.data.state === "pending") {
        return {
          status: "processing",
          message: "Task is still being processed."
        };
      } else {
        return {
          status: data.data.state,
          message: "Task status is unknown or failed.",
          rawData: data.data
        };
      }
    } catch (error) {
      console.error("Error in VeoGenerator status check:", error);
      throw new Error(`Failed to check Veo task status: ${error.message}`);
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
  const veo = new VeoGenerator();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await veo.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await veo.status(params);
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