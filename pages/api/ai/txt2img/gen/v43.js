import {
  EventSource
} from "eventsource";
import axios from "axios";
class ImageGenerator {
  constructor() {
    this.baseUrlFlux = "https://nihalgazi-flux-unlimited.hf.space";
    this.configUrl = `${this.baseUrlFlux}/config`;
    this.validServers = ["Google US Server", "Azure Lite Supercomputer Server", "Artemis GPU Super cluster", "NebulaDrive Tensor Server", "PixelNet NPU Server", "NSFW-Core: Uncensored Server", "NSFW-Core: Uncensored Server 2", "NSFW-Core: Uncensored Server 3", "NSFW-Core: Uncensored Server 4"];
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
          origin: this.baseUrlFlux,
          referer: `${this.baseUrlFlux}/`
        }
      });
      const dropdownComponent = response.data.components.find(comp => comp.id === 7);
      if (!dropdownComponent || !dropdownComponent.props.choices) {
        console.warn("Gagal menemukan daftar server dari config API, menggunakan fallback.");
        return this.validServers;
      }
      this.validServers = dropdownComponent.props.choices.map(choice => choice[1]);
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
  async flux({
    prompt,
    server = "Google US Server",
    width = 1280,
    height = 1280,
    seed = 0,
    randomizeSeed = true,
    ...rest
  }) {
    console.log("Memulai proses FLUX...");
    if (this.validServers.length === 0) {
      await this.fetchValidServers();
    }
    const headers = {
      "Content-Type": "application/json",
      origin: this.baseUrlFlux,
      referer: `${this.baseUrlFlux}/`,
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
    const data = {
      data: [prompt || "A beautiful landscape", width, height, seed, randomizeSeed, selectedServer],
      event_data: null,
      fn_index: 0,
      trigger_id: 8
    };
    try {
      const output = await this.process(this.baseUrlFlux, headers, data);
      return output;
    } catch (error) {
      console.error(`Gagal memproses FLUX: ${error.message}`);
      return null;
    }
  }
  async generate({
    prompt,
    mode = "flux",
    server,
    ...rest
  }) {
    console.log(`Memulai generate dengan mode: ${mode}`);
    if (mode === "flux") {
      return await this.flux({
        prompt: prompt,
        server: server,
        ...rest
      });
    } else {
      throw new Error(`Mode '${mode}' tidak dikenali. Hanya mode 'flux' yang didukung.`);
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