import {
  EventSource
} from "eventsource";
import axios from "axios";
class ImageGenerator {
  constructor() {
    this.baseUrl = "https://nech-c-wainsfwillustrious-v140.hf.space";
    this.configUrl = `${this.baseUrl}/config`;
    this.validServers = ["v150", "v140", "v130", "v120"];
  }
  async fetchValidServers() {
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
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`
        }
      });
      const radioComponent = response.data.components.find(comp => comp.id === 18 && comp.type === "radio");
      if (!radioComponent || !radioComponent.props.choices) {
        console.warn("Gagal menemukan daftar server dari config API, menggunakan fallback.");
        return this.validServers;
      }
      this.validServers = radioComponent.props.choices.map(choice => choice[1]);
      console.log("Daftar server dari API:", this.validServers);
      return this.validServers;
    } catch (error) {
      console.warn("Gagal mengambil config API, menggunakan fallback server list:", error.message);
      return this.validServers;
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
  async wainsfwillustrious({
    prompt,
    server = "v140",
    positivePrompt = "masterpiece, best quality, fine details",
    negativePrompt = "blurry, low quality, watermark, monochrome, text",
    seed = 0,
    randomizeSeed = true,
    width = 1024,
    height = 1024,
    guidanceScale = 6,
    inferenceSteps = 30,
    generations = 1,
    useQualityPrompt = true,
    state1 = null,
    state2 = null
  }) {
    console.log("Memulai proses Wainsfwillustrious...");
    if (this.validServers.length === 0) {
      await this.fetchValidServers();
    }
    let selectedServer = server;
    if (typeof server === "number" && Number.isInteger(server) && server >= 0 && server < this.validServers.length) {
      selectedServer = this.validServers[server];
      console.log(`Server index ${server} dikonversi ke: ${selectedServer}`);
    } else if (typeof server === "string") {
      if (!this.validServers.includes(server)) {
        throw new Error(`Server '${server}' tidak valid. Gunakan nama atau index (0-${this.validServers.length - 1}) dari daftar: ${this.validServers.join(", ")}`);
      }
    } else {
      throw new Error(`Input server tidak valid. Harus string nama atau integer index (0-${this.validServers.length - 1}).`);
    }
    if (width < 256 || width > 1920 || width % 32 !== 0) {
      throw new Error("Width harus antara 256 dan 1920, serta kelipatan 32.");
    }
    if (height < 256 || height > 1920 || height % 32 !== 0) {
      throw new Error("Height harus antara 256 dan 1920, serta kelipatan 32.");
    }
    if (guidanceScale < 0 || guidanceScale > 12) {
      throw new Error("Guidance scale harus antara 0.0 dan 12.0.");
    }
    if (inferenceSteps < 1 || inferenceSteps > 75) {
      throw new Error("Number of inference steps harus antara 1 dan 75.");
    }
    if (generations < 1 || generations > 10) {
      throw new Error("Generations harus antara 1 dan 10.");
    }
    if (seed < 0 || seed > 2147483647) {
      throw new Error("Seed harus antara 0 dan 2147483647.");
    }
    const headers = {
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
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`
    };
    const data = {
      data: [selectedServer, prompt || "A beautiful landscape", positivePrompt, negativePrompt, seed, randomizeSeed, width, height, guidanceScale, inferenceSteps, generations, state1, useQualityPrompt, state2],
      event_data: null,
      fn_index: 12,
      trigger_id: 21
    };
    try {
      const output = await this.process(this.baseUrl, headers, data);
      return output;
    } catch (error) {
      console.error(`Gagal memproses Wainsfwillustrious: ${error.message}`);
      return null;
    }
  }
  async generate({
    prompt,
    mode = "wainsfwillustrious",
    server,
    ...rest
  }) {
    console.log(`Memulai generate dengan mode: ${mode}`);
    if (mode === "wainsfwillustrious") {
      return await this.wainsfwillustrious({
        prompt: prompt,
        server: server,
        ...rest
      });
    } else {
      throw new Error(`Mode '${mode}' tidak dikenali. Hanya mode 'wainsfwillustrious' yang didukung.`);
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
  const ai = new ImageGenerator();
  try {
    const data = await ai.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}