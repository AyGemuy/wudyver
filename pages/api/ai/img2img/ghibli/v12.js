import {
  EventSource
} from "eventsource";
import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class GhibliAI {
  constructor() {
    this.uploadId = this.genId(2);
    this.hashId = this.genId(2);
    this.sessionId = this.genId(3);
    this.baseUrl = "https://azhan77168-easy-gb.hf.space/gradio_api";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Origin: "https://azhan77168-easy-gb.hf.space",
      Referer: "https://azhan77168-easy-gb.hf.space/",
      ...SpoofHead()
    };
  }
  genId(parts = 1) {
    const randomString = () => Math.random().toString(36).substring(2, 15);
    let id = "";
    for (let i = 0; i < parts; i++) {
      id += randomString();
    }
    return id;
  }
  async generate({
    imageUrl,
    prompt = "Ghibli Studio style, Charming hand-drawn anime-style illustration",
    width = 768,
    height = 768,
    seed = 42,
    control = "Ghibli"
  }) {
    console.log("Memulai proses generate...");
    try {
      console.log("Mengunduh gambar dari:", imageUrl);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      console.log("Gambar berhasil diunduh.");
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"];
      const blob = new Blob([buffer], {
        type: contentType
      });
      console.log("Blob gambar dibuat.");
      const formData = new FormData();
      formData.append("files", blob, "uploaded_image");
      const uploadUrl = `${this.baseUrl}/upload?upload_id=${this.uploadId}`;
      console.log("Mengunggah gambar ke:", uploadUrl);
      const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
          ...this.headers,
          ...formData.headers
        }
      });
      console.log("Gambar berhasil diunggah. Respon:", uploadResponse.data);
      const uploadedImagePath = Array.isArray(uploadResponse.data) && uploadResponse.data.length > 0 ? uploadResponse.data[0] : null;
      if (!uploadedImagePath) throw new Error("Gagal mendapatkan path file setelah unggah.");
      console.log("Path file setelah unggah:", uploadedImagePath);
      const submitData = {
        data: [prompt, {
          path: uploadedImagePath,
          url: `${this.baseUrl}/file=${uploadedImagePath}`,
          orig_name: uploadedImagePath.split("/").pop(),
          size: null,
          mime_type: "image/jpeg",
          meta: {
            _type: "gradio.FileData"
          }
        }, width, height, seed, control],
        event_data: null,
        fn_index: 1,
        trigger_id: 13,
        session_hash: this.sessionId
      };
      console.log("Data yang dikirim ke antrean:", submitData);
      await axios.post(`${this.baseUrl}/queue/join?`, submitData, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          Accept: "*/*"
        }
      });
      console.log("Berhasil mengirim data ke antrean.");
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${this.baseUrl}/queue/data?session_hash=${this.sessionId}`, {
          headers: this.headers
        });
        console.log("Menunggu hasil dari EventSource...");
        eventSource.onmessage = event => {
          try {
            const parsedData = JSON.parse(event.data);
            console.log("Data diterima dari EventSource:", parsedData);
            if (parsedData.msg === "process_completed" && parsedData.output?.data?.[0]) {
              eventSource.close();
              resolve(parsedData.output.data[0]);
              console.log("Proses selesai, hasil dikirim.");
            } else if (parsedData.msg === "close_stream") {
              eventSource.close();
              resolve(null);
              console.log("Stream ditutup tanpa hasil.");
            }
          } catch (error) {
            console.error("Error saat memproses data EventSource:", error);
            eventSource.close();
            reject(error);
          }
        };
        eventSource.onerror = error => {
          console.error("Error pada EventSource:", error);
          eventSource.close();
          reject(error);
        };
      });
    } catch (error) {
      console.error("Terjadi kesalahan selama proses generate:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibliAI = new GhibliAI();
  try {
    const data = await ghibliAI.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}