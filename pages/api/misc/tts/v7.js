import axios from "axios";
class LazyTTS {
  constructor() {
    this.baseURL = "https://lazypy.ro/tts";
    this.headers = {
      "accept-language": "id-ID,id;q=0.9",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      referer: this.baseURL + "/conversation.php"
    };
  }
  async list() {
    try {
      const res = await axios.get(`${this.baseURL}/assets/js/voices.json`, {
        headers: this.headers
      });
      const raw = res.data;
      const voices = [];
      for (const [service, config] of Object.entries(raw)) {
        for (const voice of config.voices) {
          voices.push({
            service: service,
            ...voice
          });
        }
      }
      return {
        voices: voices
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async create({
    text = "hello",
    voice = "nl-NL-Wavenet-D",
    service = "StreamElements",
    voice_name = "Verona",
    playlist_index = 0
  }) {
    const data = new URLSearchParams({
      service: service,
      voice: voice,
      text: text,
      voice_name: voice_name,
      playlist_index: playlist_index
    }).toString();
    try {
      const res = await axios.post(`${this.baseURL}/request_tts.php`, data, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://lazypy.ro",
          referer: `${this.baseURL}/conversation.php?voices=${service}__${voice},,`
        }
      });
      return res.data;
    } catch (e) {
      return {
        error: e.message
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
      error: "Missing required field: action",
      required: {
        action: "list | create"
      }
    });
  }
  const mic = new LazyTTS();
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