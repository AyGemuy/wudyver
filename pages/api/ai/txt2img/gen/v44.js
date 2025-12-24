import {
  EventSource
} from "eventsource";
import axios from "axios";
class CineDiffusionGenerator {
  constructor() {
    this.baseUrlCine = "https://takarajordan-cinediffusion.hf.space";
    this.configUrl = `${this.baseUrlCine}/gradio_api/info`;
    this.validAspectRatios = ["1.78:1 (16:9 Widescreen)", "2.39:1 (Modern Widescreen)", "2.76:1 (Ultra Panavision 70)", "3.00:1 (Experimental Ultra-wide)", "4.00:1 (Polyvision)", "2.55:1 (CinemaScope)", "2.20:1 (Todd-AO)", "2.00:1 (Univisium)", "2.35:1 (Anamorphic Scope)", "2.59:1 (MGM Camera 65)", "1.75:1 (IMAX Digital)", "1.43:1 (IMAX 70mm)", "2.40:1 (Modern Anamorphic)"];
  }
  async fetchValidAspectRatios() {
    try {
      const response = await axios.get(this.configUrl, {
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
          "accept-language": "id-ID",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          origin: this.baseUrlCine,
          referer: `${this.baseUrlCine}/`
        }
      });
      const aspectRatioParam = response.data.named_endpoints["/infer"].parameters.find(param => param.parameter_name === "aspect_ratio");
      if (!aspectRatioParam || !aspectRatioParam.type.enum) {
        console.warn("Gagal menemukan daftar aspect ratio dari config API, menggunakan fallback.");
        return this.validAspectRatios;
      }
      this.validAspectRatios = aspectRatioParam.type.enum;
      console.log("Daftar aspect ratio dari API:", this.validAspectRatios);
      return this.validAspectRatios;
    } catch (error) {
      console.warn("Gagal mengambil config API, menggunakan fallback aspect ratio list:", error.message);
      return this.validAspectRatios;
    }
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
      const response = await axios.post(`${baseUrl}/gradio_api/queue/join`, data, {
        headers: headers
      });
      const eventId = response.data?.event_id;
      if (!eventId) {
        throw new Error("Gagal mendapatkan event_id dari respons API.");
      }
      console.log(`Proses join berhasil dengan event_id: ${eventId}`);
      return new Promise((resolve, reject) => {
        const eventSourceUrl = `${baseUrl}/gradio_api/queue/data?session_hash=${sessionHash}`;
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
  async cinediffusion({
    prompt,
    aspect_ratio = "2.39:1 (Modern Widescreen)",
    width = 2048,
    seed = 0,
    randomize_seed = true,
    num_inference_steps = 4
  }) {
    console.log("Memulai proses CineDiffusion...");
    if (this.validAspectRatios.length === 0) {
      await this.fetchValidAspectRatios();
    }
    const headers = {
      "Content-Type": "application/json",
      origin: this.baseUrlCine,
      referer: `${this.baseUrlCine}/`,
      accept: "*/*",
      "accept-language": "id-ID",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    let selectedAspectRatio = aspect_ratio;
    if (typeof aspect_ratio === "number" && Number.isInteger(aspect_ratio) && aspect_ratio >= 0 && aspect_ratio < this.validAspectRatios.length) {
      selectedAspectRatio = this.validAspectRatios[aspect_ratio];
      console.log(`Aspect ratio index ${aspect_ratio} dikonversi ke: ${selectedAspectRatio}`);
    } else if (typeof aspect_ratio === "string") {
      if (!this.validAspectRatios.includes(aspect_ratio)) {
        throw new Error(`Aspect ratio '${aspect_ratio}' tidak valid. Gunakan nama atau index (0-${this.validAspectRatios.length - 1}) dari daftar: ${this.validAspectRatios.join(", ")}`);
      }
    } else {
      throw new Error(`Input aspect ratio tidak valid. Harus string nama atau integer index (0-${this.validAspectRatios.length - 1}).`);
    }
    const data = {
      data: [prompt || "A beautiful scene", selectedAspectRatio, width, seed, randomize_seed, num_inference_steps],
      event_data: null,
      fn_index: 2,
      trigger_id: 5
    };
    try {
      const output = await this.process(this.baseUrlCine, headers, data);
      return output;
    } catch (error) {
      console.error(`Gagal memproses CineDiffusion: ${error.message}`);
      return null;
    }
  }
  async generate({
    prompt,
    mode = "cinediffusion",
    aspect_ratio,
    ...rest
  }) {
    console.log(`Memulai generate dengan mode: ${mode}`);
    if (mode === "cinediffusion") {
      return await this.cinediffusion({
        prompt: prompt,
        aspect_ratio: aspect_ratio,
        ...rest
      });
    } else {
      throw new Error(`Mode '${mode}' tidak dikenali. Hanya mode 'cinediffusion' yang didukung.`);
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
    const api = new CineDiffusionGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}