import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class PopTTS {
  async request(endpoint, data) {
    try {
      const res = await axios.post(endpoint, data, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "application/json",
          origin: "https://poppop.ai",
          pragma: "no-cache",
          referer: "https://poppop.ai/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        responseType: "text"
      });
      return res.data;
    } catch (err) {
      return null;
    }
  }
  async create({
    text,
    speaker = "1b79f1a5c2006d6fe845f7e52d9e31a2",
    speed = 1,
    pitch = 0,
    style = ""
  }) {
    const data = {
      uuid: uuidv4(),
      text: text,
      speaker: speaker,
      speed: speed,
      pitch: pitch,
      style: style
    };
    const response = await this.request("https://aiapi.poppop.ai/text_to_speech", data);
    if (response) {
      const lines = response.split("\n").filter(v => v.startsWith("data:"));
      const line = lines.pop();
      if (line) {
        try {
          return JSON.parse(line.slice(5));
        } catch {
          return null;
        }
      }
    }
    return null;
  }
  async list({
    lang = "English (US)"
  } = {}) {
    const data = {
      uuid: uuidv4(),
      lang: lang
    };
    const response = await this.request("https://aiapi.poppop.ai/tts_voice_list", data);
    if (response) {
      try {
        return JSON.parse(response);
      } catch {
        return null;
      }
    }
    return null;
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
  const mic = new PopTTS();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action](params);
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