import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
class NotLain {
  constructor(config) {
    const defaultConfig = {
      notlain: {
        baseUrl: "https://not-lain-background-removal.hf.space"
      }
    };
    this.config = {
      ...defaultConfig,
      ...config
    };
    this.fn_index = 2;
    console.log("[LOG] NotLainProcessor diinisialisasi.");
  }
  _rnd(length) {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  async _getBuffer(source) {
    try {
      console.log("[LOG] Mempersiapkan buffer gambar...");
      if (Buffer.isBuffer(source)) {
        return source;
      }
      if (source.startsWith("http")) {
        const response = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return response.data;
      }
      return Buffer.from(source, "base64");
    } catch (error) {
      console.error("[ERROR] Gagal mempersiapkan buffer gambar:", error.message);
      throw new Error(`Gagal memproses input gambar: ${error.message}`);
    }
  }
  async generate({
    imageUrl,
    filename = "image.jpg"
  }) {
    console.log("---------------------------------");
    console.log("[LOG] Proses Not-Lain dimulai.");
    const session_hash = this._rnd(11);
    const upload_id = this._rnd(11);
    try {
      console.log(`[LOG] Mengunggah gambar dengan upload_id: ${upload_id}...`);
      const imageBuffer = await this._getBuffer(imageUrl);
      const form = new FormData();
      form.append("files", imageBuffer, {
        filename: filename
      });
      const uploadUrl = `${this.config.notlain.baseUrl}/gradio_api/upload?upload_id=${upload_id}`;
      const uploadResponse = await axios.post(uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const uploadedFilePath = uploadResponse.data[0];
      if (!uploadedFilePath) {
        throw new Error("Gagal mendapatkan path file setelah unggah.");
      }
      console.log(`[LOG] Gambar berhasil diunggah. Path: ${uploadedFilePath}`);
      console.log(`[LOG] Bergabung dengan antrian pemrosesan (session: ${session_hash})...`);
      const joinQueueUrl = `${this.config.notlain.baseUrl}/gradio_api/queue/join?`;
      const queuePayload = {
        data: [{
          path: uploadedFilePath,
          url: `${this.config.notlain.baseUrl}/gradio_api/file=${uploadedFilePath}`,
          orig_name: filename
        }],
        event_data: null,
        fn_index: this.fn_index,
        trigger_id: 13,
        session_hash: session_hash
      };
      await axios.post(joinQueueUrl, queuePayload, {
        headers: {
          "Content-Type": "application/json",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("[LOG] Berhasil bergabung dengan antrian.");
      return new Promise((resolve, reject) => {
        console.log("[LOG] Mendengarkan hasil dari stream data...");
        const dataUrl = `${this.config.notlain.baseUrl}/gradio_api/queue/data?session_hash=${session_hash}`;
        const es = new EventSource(dataUrl);
        es.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            switch (data.msg) {
              case "process_starts":
                console.log("[LOG] Pemrosesan gambar dimulai...");
                break;
              case "process_completed":
                console.log("[LOG] Pemrosesan selesai!");
                es.close();
                const resultData = data.output.data[0];
                console.log(`[LOG] Data hasil diterima.`);
                console.log("---------------------------------");
                resolve(resultData);
                break;
              case "close_stream":
                es.close();
                reject(new Error("Stream ditutup sebelum proses selesai."));
                break;
            }
          } catch (e) {}
        };
        es.onerror = error => {
          console.error("[ERROR] Terjadi kesalahan pada EventSource:", error);
          es.close();
          reject(new Error("Gagal menerima data dari server."));
        };
      });
    } catch (error) {
      console.error("\n[FATAL ERROR] Terjadi kesalahan fatal selama proses.");
      console.error(`[ERROR] Pesan: ${error.message}`);
      if (error.response) {
        console.error(`[ERROR] Status: ${error.response.status}`);
        console.error(`[ERROR] Data: ${JSON.stringify(error.response.data)}`);
      }
      console.log("---------------------------------\n");
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const api = new NotLain();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}