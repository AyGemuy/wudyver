import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
import {
  randomBytes
} from "crypto";
class HeartSync {
  constructor() {
    this.baseUrl = "https://heartsync-veo3-realtime.hf.space";
    this.axios = axios.create({
      baseURL: `${this.baseUrl}/gradio_api/`,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
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
  async txt2vid({
    prompt,
    negative_prompt = -1,
    num_inference_steps = 20
  }) {
    console.log("Mengirim tugas HeartSync text-to-video...");
    try {
      const sessionHash = randomBytes(11).toString("hex");
      const payload = {
        data: [prompt, negative_prompt, num_inference_steps],
        event_data: null,
        fn_index: 1,
        trigger_id: 10,
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
  async status({
    task_id
  }) {
    if (!task_id) {
      throw new Error("task_id (session_hash) diperlukan untuk memeriksa status.");
    }
    console.log(`Memantau status HeartSync untuk task_id: ${task_id}...`);
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
              resolve(data.output);
              break;
            case "close_stream":
              console.log(`[${task_id}] Stream ditutup oleh server.`);
              eventSource.close();
              break;
          }
        } catch (error) {
          if (event.data) {
            console.error(`[${task_id}] Gagal mem-parsing data event:`, error);
            eventSource.close();
            reject(error);
          }
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
  const generator = new HeartSync();
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
          error: `Invalid action: ${action}. Supported actions are 'txt2vid' and 'status'.`
        });
    }
  } catch (error) {
    console.error("HeartSync API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}