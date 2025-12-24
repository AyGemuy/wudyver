import axios from "axios";
import {
  EventSource
} from "eventsource";
class Animagine {
  constructor() {
    this.session_hash = Math.random().toString(36).slice(2);
    this.payload = {
      prompt: "",
      negativePrompt: "",
      seed: 807244162,
      width: 512,
      height: 512,
      guidanceScale: 7,
      numInferenceSteps: 28,
      sampler: "Euler a",
      aspectRatio: "896 x 1152",
      stylePreset: "(None)",
      qualityTags: "Standard v3.1",
      useUpscaler: false,
      strength: .55,
      upscaleBy: 1.5,
      addQualityTags: true
    };
  }
  setPayload(newPayload) {
    if (!newPayload.prompt) {
      throw new Error("Prompt is required");
    }
    this.payload = {
      ...this.payload,
      ...newPayload
    };
  }
  generatePayload() {
    return JSON.stringify({
      data: [this.payload.prompt, this.payload.negativePrompt, this.payload.seed, this.payload.width, this.payload.height, this.payload.guidanceScale, this.payload.numInferenceSteps, this.payload.sampler, this.payload.aspectRatio, this.payload.stylePreset, this.payload.qualityTags, this.payload.useUpscaler, this.payload.strength, this.payload.upscaleBy, this.payload.addQualityTags],
      event_data: null,
      fn_index: 5,
      trigger_id: null,
      session_hash: this.session_hash
    });
  }
  async request() {
    const data = this.generatePayload();
    const config = {
      method: "POST",
      url: "https://mukaist-midjourney.hf.space/queue/join?__theme=system",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        "accept-language": "id-ID",
        referer: "https://aianimegenerator.top/",
        origin: "https://aianimegenerator.top",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        priority: "u=4",
        te: "trailers"
      },
      data: data
    };
    try {
      const api = await axios.request(config);
      return api.data;
    } catch (error) {
      throw new Error("Request error: " + error.message);
    }
  }
  cekStatus() {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource("https://mukaist-midjourney.hf.space/queue/data?session_hash=" + this.session_hash);
      eventSource.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.msg === "process_completed") {
          resolve(data);
          eventSource.close();
        } else if (data.msg === "error") {
          reject(data);
          eventSource.close();
        } else {
          console.log("Event:", data);
        }
      };
      eventSource.onerror = err => {
        reject(err);
        eventSource.close();
      };
    });
  }
  async create(params) {
    try {
      this.setPayload(params);
      const postResponse = await this.request();
      const statusResponse = await this.cekStatus();
      return statusResponse;
    } catch (error) {
      throw new Error("Error: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    _,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const animagine = new Animagine();
  try {
    const response = await animagine.create(params);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}