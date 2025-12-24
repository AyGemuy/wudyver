import axios from "axios";
import {
  EventSource
} from "eventsource";
import FormData from "form-data";
class ResembleAICloner {
  constructor() {
    this.baseUrl = "https://resembleai-chatterbox.hf.space/gradio_api";
    this.sessionHash = this.generateSessionHash();
    this.axios = axios;
  }
  generateSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async uploadAudio(audioUrl) {
    const uploadId = this.generateSessionHash();
    const url = `${this.baseUrl}/upload?upload_id=${uploadId}`;
    let audioBuffer;
    let fileName = "audio.wav";
    if (typeof audioUrl === "string" && (audioUrl.startsWith("http://") || audioUrl.startsWith("https://"))) {
      try {
        const response = await this.axios.get(audioUrl, {
          responseType: "arraybuffer"
        });
        audioBuffer = Buffer.from(response.data);
        fileName = audioUrl.split("/").pop().split("?")[0] || fileName;
      } catch (error) {
        throw new Error(`Gagal mengunduh audio dari URL: ${error.message}`);
      }
    } else if (typeof audioUrl === "string") {
      audioBuffer = Buffer.from(audioUrl, "base64");
    } else if (audioUrl instanceof Buffer) {
      audioBuffer = audioUrl;
    } else {
      throw new Error("Format input audio tidak didukung. Harap berikan URL, string base64, atau Buffer.");
    }
    const formData = new FormData();
    formData.append("files", audioBuffer, {
      filename: fileName,
      contentType: "audio/wav"
    });
    try {
      const response = await this.axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          origin: "https://resembleai-chatterbox.hf.space",
          referer: "https://resembleai-chatterbox.hf.space/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      if (response.data && response.data.length > 0) {
        return {
          path: response.data[0],
          url: `https://resembleai-chatterbox.hf.space/gradio_api/file=${response.data[0]}`,
          orig_name: fileName,
          meta: {
            _type: "gradio.FileData"
          }
        };
      } else {
        throw new Error("Gagal mendapatkan path file setelah upload.");
      }
    } catch (error) {
      throw new Error(`Upload audio gagal: ${error.message}`);
    }
  }
  async generate({
    text = "Now let's make my mum's favourite. So three mars bars into the pan.",
    audioUrl,
    temperature = .5,
    guidance = .8,
    topP = 0,
    seed = .5
  } = {}) {
    try {
      let uploadedAudio = null;
      if (audioUrl) {
        uploadedAudio = await this.uploadAudio(audioUrl);
      }
      const joinResponse = await this.joinQueue({
        text: text,
        uploadedAudio: uploadedAudio,
        temperature: temperature,
        guidance: guidance,
        topP: topP,
        seed: seed
      });
      if (joinResponse.data && joinResponse.data.event_id) {
        return await this.pollTask(joinResponse.data.event_id);
      } else {
        throw new Error("Tidak ada event_id yang diterima dari antrian.");
      }
    } catch (error) {
      throw error;
    }
  }
  async joinQueue({
    text,
    uploadedAudio,
    temperature,
    guidance,
    topP,
    seed
  }) {
    const data = {
      data: [text, uploadedAudio, temperature, guidance, topP, seed],
      event_data: null,
      fn_index: 0,
      trigger_id: Math.floor(Math.random() * 20),
      session_hash: this.sessionHash
    };
    try {
      const response = await this.axios.post(`${this.baseUrl}/queue/join?`, data, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/json",
          origin: "https://resembleai-chatterbox.hf.space",
          referer: "https://resembleai-chatterbox.hf.space/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      return response;
    } catch (error) {
      throw new Error(`Gagal bergabung dengan antrian: ${error.message}`);
    }
  }
  async pollTask(eventId) {
    return new Promise((resolve, reject) => {
      try {
        const eventSource = new EventSource(`${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`);
        eventSource.onmessage = event => {
          const data = JSON.parse(event.data);
          switch (data.msg) {
            case "process_starts":
              console.log("Proses dimulai...");
              break;
            case "process_completed":
              eventSource.close();
              if (data.success && data.output) {
                resolve(data.output);
              } else {
                reject(new Error("Proses selesai tetapi gagal atau format output tidak valid."));
              }
              break;
            case "close_stream":
              eventSource.close();
              break;
          }
        };
        eventSource.onerror = error => {
          eventSource.close();
          reject(new Error("Koneksi EventSource gagal atau terjadi kesalahan."));
        };
      } catch (initializationError) {
        reject(new Error(`Gagal menginisialisasi EventSource: ${initializationError.message}`));
      }
    });
  }
  regenerateSession() {
    this.sessionHash = this.generateSessionHash();
    return this.sessionHash;
  }
  getSessionHash() {
    return this.sessionHash;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "text are required"
    });
  }
  try {
    const cloner = new ResembleAICloner();
    const response = await cloner.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}