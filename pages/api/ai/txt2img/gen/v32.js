import axios from "axios";
import {
  EventSource
} from "eventsource";
import SpoofHead from "@/lib/spoof-head";
class SanaImageGenerator {
  constructor() {
    try {
      this.baseUrl = "https://sana.hanlab.ai/gradio_api";
      this.sessionHash = Math.random().toString(36).substring(2, 15);
      this.headers = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://sana.hanlab.ai",
        referer: "https://sana.hanlab.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
    } catch (error) {
      throw new Error(`Gagal inisialisasi generator: ${error.message}`);
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      const params = {
        negativePrompt: "",
        style: "Photographic",
        enhancePrompt: false,
        batchSize: 1,
        seed: Math.floor(Math.random() * 1e9),
        width: 1024,
        height: 1024,
        guidanceScale: 3.6,
        aestheticScore: 3.5,
        steps: 20,
        safeFilter: true,
        ...rest
      };
      const requestData = {
        data: [prompt, params.negativePrompt, params.style, params.enhancePrompt, params.batchSize, params.seed, params.width, params.height, params.guidanceScale, params.aestheticScore, params.steps, params.safeFilter],
        fn_index: 3,
        trigger_id: 7,
        session_hash: this.sessionHash
      };
      const response = await axios.post(`${this.baseUrl}/queue/join`, requestData, {
        headers: this.headers,
        timeout: 1e4
      });
      if (!response.data.event_id) {
        throw new Error("Gagal mendapatkan event_id dari server.");
      }
      return await this.waitForCompletion(response.data.event_id);
    } catch (error) {
      if (error.response) {
        throw new Error(`Server error: ${error.response.status} - ${error.response.data}`);
      } else if (error.request) {
        throw new Error("Tidak ada respons dari server");
      } else {
        throw new Error(`Error: ${error.message}`);
      }
    }
  }
  async waitForCompletion(eventId) {
    return new Promise((resolve, reject) => {
      let eventSource;
      let timeout;
      try {
        eventSource = new EventSource(`${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`, {
          headers: this.headers
        });
        timeout = setTimeout(() => {
          try {
            eventSource.close();
            reject(new Error("Timeout: Tidak ada respons setelah 60 detik."));
          } catch (closeError) {
            reject(new Error("Timeout dan gagal menutup koneksi: " + closeError.message));
          }
        }, 6e4);
        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            if (data.msg === "process_completed" && data.event_id === eventId) {
              clearTimeout(timeout);
              eventSource.close();
              resolve(data);
            }
            if (data.msg === "close_stream") {
              clearTimeout(timeout);
              eventSource.close();
              reject(new Error("Stream ditutup sebelum proses selesai."));
            }
          } catch (parseError) {
            console.error("Gagal mem-parsing data:", parseError);
          }
        };
        eventSource.onerror = error => {
          try {
            clearTimeout(timeout);
            eventSource.close();
            reject(new Error("Koneksi EventSource error: " + error.message));
          } catch (closeError) {
            reject(new Error("Error dan gagal menutup koneksi: " + closeError.message));
          }
        };
      } catch (initError) {
        if (timeout) clearTimeout(timeout);
        if (eventSource) eventSource.close();
        reject(new Error("Gagal membuat EventSource: " + initError.message));
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new SanaImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}