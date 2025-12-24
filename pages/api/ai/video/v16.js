import axios from "axios";
import {
  EventSource
} from "eventsource";
import {
  randomBytes
} from "crypto";
class GradioVideo {
  constructor() {
    this.config = {
      txt2vid: {
        baseUrl: "https://heartsync-veo3-realtime.hf.space",
        endpoint: "/gradio_api/queue/join?",
        statusEndpoint: "/gradio_api/queue/data",
        fn_index: 1,
        trigger_id: 10
      },
      txt2img: {
        baseUrl: "https://heartsync-nsfw-uncensored-video2.hf.space",
        endpoint: "/gradio_api/queue/join?",
        statusEndpoint: "/gradio_api/queue/data",
        fn_index: 2,
        trigger_id: 14
      }
    };
    this.axios = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
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
    fps = 20,
    seed = -1
  }) {
    console.log("Mengirim tugas text-to-video...");
    try {
      const sessionHash = randomBytes(16).toString("hex");
      const payload = {
        data: [prompt, seed, fps],
        event_data: null,
        fn_index: this.config.txt2vid.fn_index,
        trigger_id: this.config.txt2vid.trigger_id,
        session_hash: sessionHash
      };
      const response = await this.axios.post(`${this.config.txt2vid.baseUrl}${this.config.txt2vid.endpoint}`, payload, {
        headers: {
          origin: this.config.txt2vid.baseUrl,
          referer: `${this.config.txt2vid.baseUrl}/`
        }
      });
      const eventId = response.data.event_id;
      if (!eventId) {
        throw new Error("Gagal mendapatkan event_id dari antrian.");
      }
      console.log(`Tugas berhasil dikirim. Task ID (session_hash): ${sessionHash}`);
      return {
        task_id: sessionHash,
        eventId: eventId,
        type: "txt2vid"
      };
    } catch (error) {
      console.error("Gagal mengirim tugas txt2vid:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async txt2img({
    prompt,
    negative_prompt = "text, talk bubble, low quality, watermark, signature",
    seed = 0,
    width = 1024,
    height = 1024,
    cfg_scale = 7,
    steps = 28
  }) {
    console.log("Mengirim tugas text-to-image...");
    try {
      const sessionHash = randomBytes(16).toString("hex");
      const payload = {
        data: [prompt, negative_prompt, seed, true, width, height, cfg_scale, steps],
        event_data: null,
        fn_index: this.config.txt2img.fn_index,
        trigger_id: this.config.txt2img.trigger_id,
        session_hash: sessionHash
      };
      const response = await this.axios.post(`${this.config.txt2img.baseUrl}${this.config.txt2img.endpoint}`, payload, {
        headers: {
          origin: this.config.txt2img.baseUrl,
          referer: `${this.config.txt2img.baseUrl}/`
        }
      });
      const eventId = response.data.event_id;
      if (!eventId) {
        throw new Error("Gagal mendapatkan event_id dari antrian.");
      }
      console.log(`Tugas berhasil dikirim. Task ID (session_hash): ${sessionHash}`);
      return {
        task_id: sessionHash,
        eventId: eventId,
        type: "txt2img"
      };
    } catch (error) {
      console.error("Gagal mengirim tugas txt2img:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async status({
    task_id,
    type
  }) {
    if (!task_id) {
      throw new Error("task_id (session_hash) diperlukan untuk memeriksa status.");
    }
    if (!type || type !== "txt2vid" && type !== "txt2img") {
      throw new Error("type diperlukan dan harus 'txt2vid' atau 'txt2img'.");
    }
    const config = this.config[type];
    console.log(`Memantau status untuk task_id: ${task_id} dengan type: ${type}...`);
    return new Promise((resolve, reject) => {
      const eventSourceUrl = `${config.baseUrl}${config.statusEndpoint}?session_hash=${task_id}`;
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
              resolve({
                ...data.output,
                type: type
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
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await generator.txt2img(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        if (!params.type || params.type !== "txt2vid" && params.type !== "txt2img") {
          return res.status(400).json({
            error: "type is required for status and must be 'txt2vid' or 'txt2img'."
          });
        }
        response = await generator.status({
          task_id: params.task_id,
          type: params.type
        });
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'txt2vid', 'txt2img', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}