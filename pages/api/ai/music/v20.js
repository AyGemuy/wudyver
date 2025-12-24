import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
class BrevApi {
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
    prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    style = "Sheng,Symphonic Metal,Content",
    title = "Grocery Store Anthem",
    customMode = true,
    instrumental = false,
    model = "Prime",
    privateFlag = false,
    ...rest
  }) {
    try {
      if (!prompt) throw new Error("Prompt is required");
      const {
        data: cf
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          sitekey: "0x4AAAAAAAgeJUEUvYlF2CzO",
          url: "https://brev.ai/id/app"
        }
      });
      const uid = crypto.createHash("md5").update(Date.now().toString()).digest("hex");
      const options = {
        style: style = "Sheng,Symphonic Metal,Content",
        title: title = "Grocery Store Anthem",
        customMode: customMode = true,
        instrumental: instrumental = false,
        model: model = "Prime",
        privateFlag: privateFlag = false,
        ...rest
      };
      const {
        data: task
      } = await axios.post("https://api.brev.ai/api/v1/suno/create", {
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
      throw new Error(`Failed to initiate music generation: ${error.message}`);
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
        data: statusData
      } = await axios.post("https://api.brev.ai/api/v1/suno/loadPendingRecordList", {
        pendingRecordIdList: [recordId]
      }, {
        headers: {
          uniqueid: uid,
          verify: cfToken
        }
      });
      return statusData;
    } catch (error) {
      console.error("Error in BrevApi status check:", error);
      throw new Error(`Failed to check brev task status: ${error.message}`);
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
  const brev = new BrevApi();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await brev.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await brev.status(params);
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