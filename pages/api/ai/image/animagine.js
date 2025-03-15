import axios from "axios";
import { EventSource } from "eventsource";

class Animagine {
  constructor() {
    this.session_hash = Math.random().toString(36).slice(2);
    this.payload = {
      prompt: "",
      negativePrompt: "",
      seed: 1562910602,
      width: 1024,
      height: 1024,
      guidanceScale: 7,
      numInferenceSteps: 28,
      sampler: "Euler a",
      aspectRatio: "896 x 1152",
      stylePreset: "(None)",
      qualityTags: "Standard v3.1",
      useUpscaler: false,
      strength: 0.55,
      upscaleBy: 1.5,
      addQualityTags: true
    };
  }

  setPayload(newPayload) {
    if (!newPayload.prompt) throw new Error("Prompt is required");
    this.payload = { ...this.payload, ...newPayload };
  }

  async predict() {
    try {
      const response = await axios.post(
        "https://asahina2k-animagine-xl-3-1.hf.space/run/predict",
        {
          data: [0, true],
          event_data: null,
          fn_index: 4,
          trigger_id: 50,
          session_hash: this.session_hash
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Predict request failed: ${error.message}`);
    }
  }

  async joinQueue() {
    try {
      const response = await axios.post(
        "https://asahina2k-animagine-xl-3-1.hf.space/queue/join?",
        {
          data: [
            this.payload.prompt,
            this.payload.negativePrompt,
            this.payload.seed,
            this.payload.width,
            this.payload.height,
            this.payload.guidanceScale,
            this.payload.numInferenceSteps,
            this.payload.sampler,
            this.payload.aspectRatio,
            this.payload.stylePreset,
            this.payload.qualityTags,
            this.payload.useUpscaler,
            this.payload.strength,
            this.payload.upscaleBy,
            this.payload.addQualityTags
          ],
          event_data: null,
          fn_index: 5,
          trigger_id: 50,
          session_hash: this.session_hash
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Join queue failed: ${error.message}`);
    }
  }

  cekStatus() {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(
        `https://asahina2k-animagine-xl-3-1.hf.space/queue/data?session_hash=${this.session_hash}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.msg === "process_completed") {
          eventSource.close();
          resolve(data);
        } else if (data.msg === "error") {
          eventSource.close();
          reject(new Error(`Error from server: ${data.detail || "Unknown error"}`));
        }
      };

      eventSource.onerror = (err) => {
        eventSource.close();
        reject(new Error(`EventSource error: ${err.message}`));
      };
    });
  }

  async create(params) {
    try {
      this.setPayload(params);
      await this.predict();
      await this.joinQueue();
      return await this.cekStatus();
    } catch (error) {
      throw new Error(`Create failed: ${error.message}`);
    }
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      Origin: "https://asahina2k-animagine-xl-3-1.hf.space",
      Referer: "https://asahina2k-animagine-xl-3-1.hf.space/"
    };
  }
}

export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
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