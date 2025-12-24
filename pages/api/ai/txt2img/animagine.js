import axios from "axios";
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
      strength: .55,
      upscaleBy: 1.5,
      addQualityTags: true
    };
  }
  setPayload(newPayload) {
    if (!newPayload.prompt) throw new Error("Prompt is required");
    this.payload = {
      ...this.payload,
      ...newPayload
    };
  }
  async predict() {
    await axios.post("https://asahina2k-animagine-xl-3-1.hf.space/run/predict", {
      data: [0, true],
      event_data: null,
      fn_index: 4,
      trigger_id: 50,
      session_hash: this.session_hash
    }, {
      headers: this.getHeaders()
    });
  }
  async joinQueue() {
    await axios.post("https://asahina2k-animagine-xl-3-1.hf.space/queue/join?", {
      data: [this.payload.prompt, this.payload.negativePrompt, this.payload.seed, this.payload.width, this.payload.height, this.payload.guidanceScale, this.payload.numInferenceSteps, this.payload.sampler, this.payload.aspectRatio, this.payload.stylePreset, this.payload.qualityTags, this.payload.useUpscaler, this.payload.strength, this.payload.upscaleBy, this.payload.addQualityTags],
      event_data: null,
      fn_index: 5,
      trigger_id: 50,
      session_hash: this.session_hash
    }, {
      headers: this.getHeaders()
    });
  }
  async cekStatus(retries = 30, interval = 5e3) {
    while (retries > 0) {
      try {
        const response = await axios.get(`https://asahina2k-animagine-xl-3-1.hf.space/queue/data?session_hash=${this.session_hash}`, {
          headers: this.getHeaders(),
          responseType: "text"
        });
        console.log("Response Data:", response.data);
        const lines = response.data.split("\n").filter(line => line.startsWith("data:"));
        const lastData = lines.pop()?.slice(5)?.trim();
        if (!lastData) throw new Error("Invalid data format from server");
        const data = JSON.parse(lastData);
        if (data.msg === "process_completed") return data;
        if (data.msg === "error") throw new Error(`Error from server: ${data.detail || "Unknown error"}`);
        if (data.msg === "progress" && data.progress_data.length > 0) {
          const progress = data.progress_data[0];
          console.log(`Progress: ${progress.index}/${progress.length} ${progress.unit}`);
        }
      } catch (error) {
        if (retries === 1) throw new Error(`Failed to fetch status: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
      retries--;
    }
    throw new Error("Status check timeout");
  }
  async create(params) {
    try {
      this.setPayload(params);
      await this.predict();
      await this.joinQueue();
      const result = await this.cekStatus();
      const imageUrl = result.output?.data?.[0]?.[0]?.image?.url;
      if (!imageUrl) throw new Error("Image URL not found");
      return imageUrl;
    } catch (error) {
      throw new Error(`Create failed: ${error.message}`);
    }
  }
  getHeaders() {
    return {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
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
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}