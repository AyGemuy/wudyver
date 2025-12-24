import axios from "axios";
class SoundOfText {
  constructor() {
    this.baseURL = "https://api.soundoftext.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://soundoftext.com",
      referer: "https://soundoftext.com/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "content-type": "application/json"
    };
  }
  async list() {
    try {
      const res = await axios.get(`${this.baseURL}/voices`, {
        headers: this.headers
      });
      console.log("[SoundOfText] Voice list fetched");
      return res.data;
    } catch (e) {
      console.error("[SoundOfText] Failed to fetch voice list:", e);
      return {
        error: e.toString()
      };
    }
  }
  async create({
    text = "",
    voice = "id-ID",
    engine = "Google"
  }) {
    try {
      const res = await axios.post(`${this.baseURL}/sounds`, {
        engine: engine,
        data: {
          text: text,
          voice: voice
        }
      }, {
        headers: this.headers
      });
      const id = res.data?.id;
      if (!id) throw new Error("Gagal membuat task ID");
      console.log("[SoundOfText] Created ID:", id);
      return await this.poll(id);
    } catch (e) {
      console.error("[SoundOfText] Failed to create task:", e);
      return {
        error: e.toString()
      };
    }
  }
  async poll(id) {
    const maxTime = 6e4;
    const interval = 3e3;
    const start = Date.now();
    while (Date.now() - start < maxTime) {
      try {
        const res = await axios.get(`${this.baseURL}/sounds/${id}`, {
          headers: this.headers
        });
        const status = res.data?.status;
        const location = res.data?.location;
        if (status === "Done" && location) {
          console.log("[SoundOfText] Audio ready:", location);
          return {
            url: location
          };
        } else {
          console.log(`[SoundOfText] Status: ${status}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (e) {
        console.error("[SoundOfText] Polling error:", e);
        break;
      }
    }
    return {
      error: "Timeout after 60 seconds"
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
      error: "Missing required field: action",
      required: {
        action: "list | create"
      }
    });
  }
  const mic = new SoundOfText();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action]();
        break;
      case "create":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: list | create`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}