import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
import {
  randomBytes
} from "crypto";
import PROMPT from "@/configs/ai-prompt";
class GradioIcedit {
  constructor() {
    this.baseUrl = "https://riverz-icedit.hf.space";
    this.axios = axios.create({
      baseURL: `${this.baseUrl}/gradio_api/`,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: this.baseUrl,
        referer: `${this.baseUrl}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async create({
    imageUrl,
    prompt = PROMPT.text,
    width = 1024,
    height = 1024
  }) {
    console.log("Mengirim tugas image edit...");
    try {
      const sessionHash = randomBytes(11).toString("hex");
      console.log("Mengunggah gambar...");
      const uploadId = randomBytes(8).toString("hex");
      let imageBuffer;
      let filename;
      if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
        filename = imageUrl.split("/").pop().split("?")[0] || "image.jpg";
      } else {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
        filename = "image.jpg";
      }
      const formData = new FormData();
      formData.append("files", imageBuffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      const uploadResponse = await this.axios.post(`upload?upload_id=${uploadId}`, formData, {
        headers: {
          ...this.axios.defaults.headers.common,
          ...formData.getHeaders()
        }
      });
      const uploadedFile = uploadResponse.data[0];
      if (!uploadedFile) throw new Error("Gagal mengunggah gambar.");
      console.log(`Gambar berhasil diunggah ke: ${uploadedFile}`);
      const payload = {
        data: [{
          path: uploadedFile,
          url: `${this.baseUrl}/gradio_api/file=${uploadedFile}`,
          orig_name: filename,
          size: imageBuffer.length,
          mime_type: "image/jpeg",
          meta: {
            _type: "gradio.FileData"
          }
        }, prompt, 0, true, width, height, 50, 28, 1],
        event_data: null,
        fn_index: 1,
        trigger_id: 7,
        session_hash: sessionHash
      };
      const joinResponse = await this.axios.post("queue/join?", payload, {
        headers: {
          ...this.axios.defaults.headers.common,
          "content-type": "application/json"
        }
      });
      const eventId = joinResponse.data.event_id;
      if (!eventId) {
        throw new Error("Gagal mendapatkan event_id dari antrian.");
      }
      console.log(`Tugas berhasil dikirim. Task ID (session_hash): ${sessionHash}`);
      return {
        task_id: sessionHash,
        eventId: eventId
      };
    } catch (error) {
      console.error("Gagal mengirim tugas create:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) {
      throw new Error("task_id (session_hash) diperlukan untuk memeriksa status.");
    }
    console.log(`Memantau status untuk task_id: ${task_id}...`);
    return new Promise((resolve, reject) => {
      const eventSourceUrl = `${this.axios.defaults.baseURL}queue/data?session_hash=${task_id}`;
      const eventSource = new EventSource(eventSourceUrl);
      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          switch (data.msg) {
            case "process_starts":
              console.log(`[${task_id}] Proses dimulai...`);
              break;
            case "process_generating":
              console.log(`[${task_id}] Sedang menghasilkan...`);
              break;
            case "process_completed":
              console.log(`[${task_id}] Proses Selesai!`);
              eventSource.close();
              const resultUrl = data.output.data[0][0].url;
              console.log(`[${task_id}] URL Hasil: ${resultUrl}`);
              resolve({
                ...data.output,
                result_url: resultUrl
              });
              break;
            case "close_stream":
              console.log(`[${task_id}] Stream ditutup oleh server.`);
              eventSource.close();
              break;
          }
        } catch (error) {
          console.error(`[${task_id}] Gagal mem-parsing data event:`, error);
          eventSource.close();
          reject(error);
        }
      };
      eventSource.onerror = error => {
        console.error(`[${task_id}] Terjadi kesalahan pada EventSource:`, error);
        eventSource.close();
        reject(error);
      };
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action 'create' atau 'status' diperlukan."
    });
  }
  const icedit = new GradioIcedit();
  try {
    let response;
    switch (action) {
      case "create":
        if (!!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' diperlukan untuk action 'create'."
          });
        }
        response = await icedit.create(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' diperlukan untuk action 'status'."
          });
        }
        response = await icedit.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung adalah 'create' dan 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}