import axios from "axios";
import {
  EventSource
} from "eventsource";
class AiAnime {
  constructor() {
    this.baseURL = "https://huggingface.co";
    this.spaceName = "Asahina2K/animagine-xl-3.1";
    this.sessionHash = `xsny4c${Math.random().toString(36).substring(2, 10)}`;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://aianimegenerator.top",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://aianimegenerator.top/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.hostURL = null;
    this.isQueueJoined = false;
    this.eventId = null;
  }
  async getHost() {
    try {
      const response = await axios.get(`${this.baseURL}/api/spaces/${this.spaceName}/host`, {
        headers: this.headers
      });
      this.hostURL = response.data.host;
      return this.hostURL;
    } catch (error) {
      throw error;
    }
  }
  async joinQueue({
    prompt = "men in the room,Family-friendly AI art,Safe AI drawing",
    negativePrompt = "",
    seed = 2041843484,
    width = 512,
    height = 512,
    steps = 28,
    guidanceScale = 7,
    sampler = "Euler a",
    resolution = "896 x 1152",
    sdxlStyle = "(None)",
    qualityTags = "Standard v3.1",
    streamVid = false,
    denoisingStrength = .55,
    upscaleRatio = 1.5,
    streamThumb = true
  }) {
    if (!this.hostURL) {
      await this.getHost();
    }
    const dataRaw = {
      data: [prompt, negativePrompt, seed, width, height, guidanceScale, steps, sampler, resolution, sdxlStyle, qualityTags, streamVid, denoisingStrength, upscaleRatio, streamThumb],
      event_data: null,
      fn_index: 5,
      trigger_id: null,
      session_hash: this.sessionHash
    };
    try {
      const response = await axios.post(`${this.hostURL}/queue/join?`, dataRaw, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      this.eventId = response.data.event_id;
      this.isQueueJoined = true;
      return this.eventId;
    } catch (error) {
      throw error;
    }
  }
  async generate(generationOptions) {
    try {
      await this.getHost();
      await this.joinQueue(generationOptions);
      return new Promise((resolve, reject) => {
        if (!this.hostURL || !this.isQueueJoined || !this.eventId) {
          reject("Host belum didapatkan atau antrian belum joined.");
          return;
        }
        const eventSourceURL = `${this.hostURL}/queue/data?session_hash=${this.sessionHash}`;
        const eventSource = new EventSource(eventSourceURL, {
          headers: this.headers
        });
        eventSource.onmessage = event => {
          if (event.data) {
            try {
              const parsedData = JSON.parse(event.data);
              if (parsedData.msg === "process_completed" && parsedData.output) {
                eventSource.close();
                resolve(parsedData.output);
              }
            } catch (error) {
              console.error("Gagal memproses data EventSource:", error, event.data);
            }
          }
        };
        eventSource.onerror = error => {
          eventSource.close();
          reject(error);
        };
      });
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new AiAnime();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}