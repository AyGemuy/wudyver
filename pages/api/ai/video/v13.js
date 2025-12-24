import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
import {
  randomBytes
} from "crypto";
class GradioVideo {
  constructor() {
    this.baseUrl = "https://greff3-ltx-video-distilled.hf.space";
    this.axios = axios.create({
      baseURL: `${this.baseUrl}/gradio_api/`,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: this.baseUrl,
        referer: `${this.baseUrl}/`,
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async txt2vid({
    prompt,
    negative_prompt = "worst quality, inconsistent motion, blurry, jittery, distorted",
    width = 512,
    height = 704,
    steps = 9,
    seed = 42
  }) {
    console.log("Mengirim tugas text-to-video...");
    try {
      const sessionHash = randomBytes(16).toString("hex");
      const payload = {
        data: [prompt, negative_prompt, "", "", width, height, "text-to-video", 2, steps, seed, true, 1, true],
        event_data: null,
        fn_index: 4,
        trigger_id: 16,
        session_hash: sessionHash
      };
      const response = await this.axios.post("queue/join?", payload);
      const eventId = response.data.event_id;
      if (!eventId) {
        throw new Error("Gagal mendapatkan event_id dari antrian.");
      }
      console.log(`Tugas berhasil dikirim. Task ID (session_hash): ${sessionHash}`);
      return {
        task_id: sessionHash,
        eventId: eventId
      };
    } catch (error) {
      console.error("Gagal mengirim tugas txt2vid:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async img2vid({
    prompt,
    imageUrl,
    negative_prompt = "worst quality, inconsistent motion, blurry, jittery, distorted",
    width = 768,
    height = 768,
    steps = 9
  }) {
    console.log("Mengirim tugas image-to-video...");
    try {
      const sessionHash = randomBytes(16).toString("hex");
      console.log("Mengunggah gambar...");
      const uploadId = randomBytes(8).toString("hex");
      let imageBuffer;
      let filename;
      if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
        filename = imageUrl.split("/").pop() || "image.jpg";
      } else {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
        filename = "image.jpg";
      }
      const formData = new FormData();
      formData.append("files", imageBuffer, filename);
      const uploadResponse = await this.axios.post(`upload?upload_id=${uploadId}`, formData, {
        headers: formData.getHeaders()
      });
      const uploadedFilePath = uploadResponse.data[0];
      if (!uploadedFilePath) throw new Error("Gagal mengunggah gambar.");
      console.log(`Gambar berhasil diunggah ke: ${uploadedFilePath}`);
      const payload = {
        data: [prompt, negative_prompt, {
          path: uploadedFilePath,
          url: `${this.baseUrl}/gradio_api/file=${uploadedFilePath}`,
          orig_name: filename,
          meta: {
            _type: "gradio.FileData"
          }
        }, "", width, height, "image-to-video", 5, steps, Math.floor(Math.random() * 1e9), true, 1, true],
        event_data: null,
        fn_index: 5,
        trigger_id: 9,
        session_hash: sessionHash
      };
      const response = await this.axios.post("queue/join?", payload);
      const eventId = response.data.event_id;
      if (!eventId) throw new Error("Gagal mendapatkan event_id dari antrian.");
      console.log(`Tugas berhasil dikirim. Task ID (session_hash): ${sessionHash}`);
      return {
        task_id: sessionHash,
        eventId: eventId
      };
    } catch (error) {
      console.error("Gagal mengirim tugas img2vid:", error.response ? error.response.data : error.message);
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
              console.log(`[${task_id}] Sedang menghasilkan...`, data.output.step, "/", data.output.total_steps);
              break;
            case "process_completed":
              console.log(`[${task_id}] Proses Selesai!`);
              eventSource.close();
              resolve(data.output);
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
      error: "Action is required."
    });
  }
  const generator = new GradioVideo();
  try {
    let response;
    switch (action) {
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        response = await generator.txt2vid(params);
        return res.status(200).json(response);
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl is required for img2vid."
          });
        }
        response = await generator.img2vid(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await generator.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'txt2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}