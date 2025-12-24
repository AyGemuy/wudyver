import {
  EventSource
} from "eventsource";
import axios from "axios";
class ImageGenerator {
  constructor() {
    this.baseUrlDiffusion = "https://vidraft-stable-diffusion-3-5-large-turbox.hf.space";
    this.baseUrlDalle = "https://ehristoforu-dalle-3-xl-lora-v2.hf.space";
    this.baseUrlOpenDalle = "https://mrfakename-opendallev1-1-gpu-demo.hf.space";
  }
  createSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async process(baseUrl, headers, data) {
    console.log("Memulai proses join...");
    const sessionHash = this.createSessionHash();
    data.session_hash = sessionHash;
    try {
      const response = await axios.post(`${baseUrl}/queue/join`, data, {
        headers: headers
      });
      const eventId = response.data?.event_id;
      if (!eventId) {
        throw new Error("Gagal mendapatkan event_id dari respons API.");
      }
      console.log(`Proses join berhasil dengan event_id: ${eventId}`);
      return new Promise((resolve, reject) => {
        const eventSourceUrl = `${baseUrl}/queue/data?session_hash=${sessionHash}`;
        const eventSource = new EventSource(eventSourceUrl);
        eventSource.onmessage = event => {
          const eventData = JSON.parse(event.data);
          const msg = eventData.msg || "status_update";
          console.log(`Menerima stream: ${msg}`);
          if (eventData.msg === "process_completed") {
            console.log("Proses selesai.");
            eventSource.close();
            console.log("Koneksi stream ditutup.");
            resolve(eventData.output);
          }
        };
        eventSource.onerror = error => {
          console.error("Terjadi error pada EventSource:", error);
          eventSource.close();
          reject(new Error("Koneksi stream gagal atau terputus."));
        };
      });
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Gagal melakukan request:", errorMessage);
      throw new Error(`Request gagal: ${errorMessage}`);
    }
  }
  async diffusion({
    prompt,
    ...rest
  }) {
    console.log("Memulai proses diffusion...");
    const apiUrl = `${this.baseUrlDiffusion}`;
    const headers = {
      "Content-Type": "application/json",
      origin: this.baseUrlDiffusion,
      referer: `${this.baseUrlDiffusion}/`
    };
    const data = {
      data: [prompt || "a beautiful landscape", rest.negativePrompt || "", rest.seed || 0, rest.randomizeSeed ?? true, rest.width || 1024, rest.height || 1024, rest.guidanceScale || 1.5, rest.inferenceSteps || 8],
      event_data: null,
      fn_index: 2,
      trigger_id: 6
    };
    try {
      const output = await this.process(apiUrl, headers, data);
      return output;
    } catch (error) {
      console.error(`Gagal memproses diffusion: ${error.message}`);
      return null;
    }
  }
  async dalle({
    prompt,
    ...rest
  }) {
    console.log("Memulai proses DALL-E...");
    const apiUrl = `${this.baseUrlDalle}`;
    const headers = {
      "Content-Type": "application/json",
      origin: this.baseUrlDalle,
      referer: `${this.baseUrlDalle}/?__theme=system`
    };
    const data = {
      data: [prompt || "neon holography crystal cat", rest.negativePrompt || "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation, (NSFW:1.25)", rest.useNegativePrompt ?? true, rest.seed || 0, rest.width || 1024, rest.height || 1024, rest.guidanceScale || 6, rest.randomizeSeed ?? true],
      event_data: null,
      fn_index: 3,
      trigger_id: 6
    };
    try {
      const output = await this.process(apiUrl, headers, data);
      return output;
    } catch (error) {
      console.error(`Gagal memproses DALL-E: ${error.message}`);
      return null;
    }
  }
  async opendalle({
    prompt,
    ...rest
  }) {
    console.log("Memulai proses OpenDalle...");
    const apiUrl = this.baseUrlOpenDalle;
    const headers = {
      "Content-Type": "application/json",
      origin: this.baseUrlOpenDalle,
      referer: `${this.baseUrlOpenDalle}/`
    };
    const data = {
      data: [prompt || "meb", rest.negativePrompt || null, null, null, false, false, false, rest.seed || 746641501, rest.width || 1024, rest.height || 1024, rest.param1 || 5, rest.param2 || 5, rest.param3 || 25, rest.param4 || 25, false],
      event_data: null,
      fn_index: 7,
      trigger_id: 5
    };
    try {
      const output = await this.process(apiUrl, headers, data);
      return output;
    } catch (error) {
      console.error(`Gagal memproses OpenDalle: ${error.message}`);
      return null;
    }
  }
  async generate({
    prompt,
    mode = "opendalle",
    ...rest
  }) {
    console.log(`Memulai generate dengan mode: ${mode}`);
    if (mode === "dalle") {
      return await this.dalle({
        prompt: prompt,
        ...rest
      });
    } else if (mode === "diffusion") {
      return await this.diffusion({
        prompt: prompt,
        ...rest
      });
    } else if (mode === "opendalle") {
      return await this.opendalle({
        prompt: prompt,
        ...rest
      });
    } else {
      throw new Error(`Mode '${mode}' tidak dikenali. Gunakan 'dalle', 'diffusion', atau 'opendalle'.`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new ImageGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}