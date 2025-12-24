import {
  EventSource
} from "eventsource";
import axios from "axios";
class GradioAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || "https://kingnish-sdxl-flash.hf.space";
  }
  sh() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log("Memulai proses generate...");
    const negative_prompt = rest.negative_prompt || "";
    const use_negative_prompt = rest.use_negative_prompt ?? true;
    const seed = rest.seed || 0;
    const width = rest.width || 1024;
    const height = rest.height || 1024;
    const guidance_scale = rest.guidance_scale || 3;
    const steps = rest.steps || 8;
    const random = rest.random || true;
    const sessionHash = this.sh();
    console.log(`Session hash dibuat: ${sessionHash}`);
    const headers = {
      "content-type": "application/json",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`
    };
    const data = {
      data: [prompt, negative_prompt, use_negative_prompt, seed, width, height, guidance_scale, steps, random],
      event_data: null,
      fn_index: 3,
      trigger_id: 5,
      session_hash: sessionHash
    };
    const apiUrl = `${this.baseUrl}/gradio_api`;
    try {
      console.log("Mengirim permintaan ke /queue/join...");
      const response = await axios.post(`${apiUrl}/queue/join`, data, {
        headers: headers
      });
      const eventId = response.data?.event_id;
      if (!eventId) {
        throw new Error("Gagal mendapatkan event_id dari respons API.");
      }
      console.log(`Berhasil bergabung ke antrian dengan event_id: ${eventId}`);
      return new Promise((resolve, reject) => {
        const eventSourceUrl = `${apiUrl}/queue/data?session_hash=${sessionHash}`;
        const eventSource = new EventSource(eventSourceUrl);
        eventSource.onopen = () => {
          console.log("Koneksi stream (EventSource) berhasil dibuka.");
        };
        eventSource.onmessage = event => {
          const logMessage = event.data || "Menerima data kosong dari stream.";
          console.log(`Log stream: ${logMessage}`);
          if (event.data) {
            const parsedData = JSON.parse(event.data);
            if (parsedData?.msg === "process_completed") {
              console.log("Proses pada server selesai.");
              eventSource.close();
              console.log("Koneksi stream ditutup.");
              resolve(parsedData.output);
            }
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
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const ai = new GradioAPI();
  try {
    const data = await ai.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}