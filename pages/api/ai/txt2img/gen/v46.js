import {
  EventSource
} from "eventsource";
import axios from "axios";
class MiragicImageGenerator {
  constructor() {
    this.baseUrl = "https://miragic-ai-miragic-ai-image-generator.hf.space";
  }
  createSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async process(headers, payload) {
    const sessionHash = this.createSessionHash();
    payload.session_hash = sessionHash;
    console.log("Mengirim permintaan ke antrian dengan session hash:", sessionHash);
    try {
      await axios.post(`${this.baseUrl}/gradio_api/queue/join`, payload, {
        headers: headers
      });
      console.log("Berhasil bergabung dengan antrian. Menunggu data stream...");
      return new Promise((resolve, reject) => {
        const eventSourceUrl = `${this.baseUrl}/gradio_api/queue/data?session_hash=${sessionHash}`;
        const eventSource = new EventSource(eventSourceUrl);
        eventSource.onmessage = event => {
          const eventData = JSON.parse(event.data);
          const msg = eventData.msg || "status_update";
          console.log(`Menerima pesan stream: ${msg}`);
          if (eventData.msg === "process_starts") {
            console.log(`Proses dimulai, peringkat antrian: ${eventData.rank}`);
          }
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
      console.error("Gagal melakukan permintaan API:", errorMessage);
      throw new Error(`Permintaan API gagal: ${errorMessage}`);
    }
  }
  async generate({
    prompt,
    model = "flux",
    width = 1024,
    height = 1024,
    seed = -1,
    imageUrl = "",
    enhancePrompt = false,
    safeFilter = false
  }) {
    if (!prompt) {
      throw new Error("Paramenter 'prompt' wajib diisi.");
    }
    console.log(`Memulai proses generate dengan model: ${model}`);
    const headers = {
      "Content-Type": "application/json",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      accept: "*/*",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    };
    const dataPayload = {
      data: [prompt, model, width, height, seed, imageUrl, enhancePrompt, safeFilter],
      event_data: null,
      fn_index: 1,
      trigger_id: 23
    };
    try {
      const output = await this.process(headers, dataPayload);
      return output;
    } catch (error) {
      console.error(`Gagal menghasilkan gambar: ${error.message}`);
      return null;
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
  const ai = new MiragicImageGenerator();
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