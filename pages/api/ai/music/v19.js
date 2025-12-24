import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class SongGenerator {
  constructor(baseURL = "https://aisonggenerator.online/api") {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://aisonggenerator.online",
        priority: "u=1, i",
        referer: "https://aisonggenerator.online/dashboard",
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
  }
  async create({
    prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    ...rest
  }) {
    try {
      const anonymousUserToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      console.log("Creating song with token:", anonymousUserToken);
      const response = await this.client.post("/music/generate", {
        prompt: prompt,
        style: rest.style || "Pop, Acoustic",
        title: rest.title || "Default Test Song",
        customMode: rest.customMode !== undefined ? rest.customMode : true,
        instrumental: rest.instrumental !== undefined ? rest.instrumental : false,
        isPrivate: rest.isPrivate !== undefined ? rest.isPrivate : false,
        voice: rest.voice || "random",
        negative_prompt: rest.negative_prompt || "",
        anonymousUserToken: anonymousUserToken,
        ...rest
      });
      return {
        task_id: anonymousUserToken
      };
    } catch (error) {
      console.error("Error creating song:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data));
      }
      throw error;
    }
  }
  async status({
    task_id: token
  }) {
    try {
      const response = await this.client.get("/music/list", {
        params: {
          page: 1,
          anonymousUserToken: token
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error checking status:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data));
      }
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
  const generator = new SongGenerator();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "prompt is required for 'create' action."
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