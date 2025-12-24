import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
class MoeTTS {
  constructor() {
    this.session_hash = this._generateHash(11);
    this.api = axios.create({
      baseURL: "https://skytnt-moe-tts.hf.space",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://skytnt-moe-tts.hf.space",
        priority: "u=1, i",
        referer: "https://skytnt-moe-tts.hf.space/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log(`[MoeTTS] Client initialized with session_hash: ${this.session_hash}`);
  }
  _generateHash(length = 10) {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  async _upload(audioInput) {
    console.log("Proses: Memulai unggah audio...");
    let audioBuffer;
    let fileName = "audio.mp3";
    try {
      if (Buffer.isBuffer(audioInput)) {
        audioBuffer = audioInput;
      } else if (typeof audioInput === "string" && audioInput.startsWith("http")) {
        const response = await axios.get(audioInput, {
          responseType: "arraybuffer"
        });
        audioBuffer = Buffer.from(response.data);
        fileName = audioInput.split("/").pop() || fileName;
      } else if (typeof audioInput === "string") {
        const base64Data = audioInput.includes(",") ? audioInput.split(",")[1] : audioInput;
        audioBuffer = Buffer.from(base64Data, "base64");
      } else {
        throw new Error("Format audioUrl tidak didukung.");
      }
      const form = new FormData();
      form.append("files", audioBuffer, {
        filename: fileName
      });
      const uploadId = this._generateHash(12);
      const response = await this.api.post(`/upload?upload_id=${uploadId}`, form, {
        headers: form.getHeaders()
      });
      const filePath = response?.data?.[0];
      if (!filePath) throw new Error("Gagal mendapatkan path file dari respons unggah.");
      console.log(`Proses: Unggah berhasil. Path file: ${filePath}`);
      return {
        path: filePath,
        url: `${this.api.defaults.baseURL}/file=${filePath}`,
        orig_name: fileName,
        meta: {
          _type: "gradio.FileData"
        }
      };
    } catch (error) {
      console.error("Error saat proses unggah:", error.message);
      throw error;
    }
  }
  _listen() {
    console.log("Proses: Mendengarkan hasil dari stream (via EventSource)...");
    return new Promise((resolve, reject) => {
      const streamUrl = `${this.api.defaults.baseURL}/queue/data?session_hash=${this.session_hash}`;
      const eventSourceInitDict = {
        headers: this.api.defaults.headers
      };
      const es = new EventSource(streamUrl, eventSourceInitDict);
      const timeout = setTimeout(() => {
        es.close();
        reject(new Error("Timeout: Tidak ada hasil setelah 60 detik."));
      }, 6e4);
      es.onopen = () => {
        console.log("[EventSource] Koneksi stream terbuka.");
      };
      es.onerror = err => {
        clearTimeout(timeout);
        es.close();
        reject(new Error(`[EventSource] Terjadi error pada koneksi: ${err.message || "Error tidak diketahui"}`));
      };
      es.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.msg === "process_completed") {
            const output = data?.output;
            if (output) {
              console.log("Proses: Selesai. Output data ditemukan.");
              clearTimeout(timeout);
              es.close();
              resolve(output);
            } else {
              reject(new Error("Proses selesai namun tidak ada objek output."));
              clearTimeout(timeout);
              es.close();
            }
          } else if (data.msg === "close_stream") {
            console.log("[EventSource] Stream ditutup oleh server.");
            clearTimeout(timeout);
            es.close();
          }
        } catch (e) {}
      };
    });
  }
  async generate({
    text = "こんにちは。",
    audioUrl = null,
    speaker = "和泉妃愛",
    target_speaker = "因幡めぐる",
    speed = 1,
    is_symbol = false
  }) {
    try {
      let payloadData;
      let fn_index;
      if (audioUrl) {
        console.log(`Mode: Voice Conversion (Speaker: ${speaker} -> ${target_speaker})`);
        const fileObject = await this._upload(audioUrl);
        payloadData = [speaker, target_speaker, fileObject];
        fn_index = 54;
      } else {
        console.log(`Mode: Text-to-Speech (Speaker: ${speaker})`);
        payloadData = [text, speaker, speed, is_symbol];
        fn_index = 3;
      }
      const body = {
        data: payloadData,
        fn_index: fn_index,
        session_hash: this.session_hash,
        event_data: null,
        trigger_id: Math.floor(Math.random() * 50) + 10
      };
      console.log("Proses: Mengirim pekerjaan ke antrian...");
      await this.api.post("/queue/join?", body, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const result = await this._listen();
      return result;
    } catch (error) {
      console.error("Error pada proses generate:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "generate"
      }
    });
  }
  const mic = new MoeTTS();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: generate`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}