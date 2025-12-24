import axios from "axios";
import {
  EventSource
} from "eventsource";
class DeepseekChat {
  constructor(baseUrl = "https://ginigen-deepseek-r1-0528-api.hf.space/gradio_api") {
    this.baseUrl = baseUrl;
    this.sessionHash = this.generateSessionHash();
  }
  generateSessionHash() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  async chat({
    prompt,
    search = true,
    timeout = 3e4,
    ...rest
  }) {
    try {
      const joinQueueUrl = `${this.baseUrl}/queue/join?`;
      const joinQueuePayload = {
        data: [prompt, [], search],
        event_data: null,
        fn_index: 2,
        trigger_id: 13,
        session_hash: this.sessionHash
      };
      const joinQueueResponse = await axios.post(joinQueueUrl, joinQueuePayload, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://ginigen-deepseek-r1-0528-api.hf.space",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://ginigen-deepseek-r1-0528-api.hf.space/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        },
        timeout: 1e4
      });
      const {
        event_id
      } = joinQueueResponse.data;
      console.log(`Berhasil bergabung ke antrian dengan event_id: ${event_id}`);
      const dataStreamUrl = `${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`;
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(dataStreamUrl);
        let isResolved = false;
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            console.error("Timeout: Tidak ada respon dalam waktu yang ditentukan");
            eventSource.close();
            isResolved = true;
            reject(new Error(`Timeout: Tidak ada respon dalam ${timeout}ms`));
          }
        }, timeout);
        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received data:", data.msg, data.event_id);
            if (data.msg === "process_completed") {
              if (!isResolved) {
                clearTimeout(timeoutId);
                eventSource.close();
                isResolved = true;
                resolve(data.output);
              }
            } else if (data.msg === "process_starts") {
              console.log("Proses dimulai...");
            } else if (data.msg === "estimation") {
              console.log(`Estimasi waktu: ${data.rank} dalam antrian`);
            } else if (data.msg === "send_data") {
              console.log("Mengirim data...");
            } else if (data.msg === "send_hash") {
              console.log("Mengirim hash...");
            }
          } catch (parseError) {
            console.error("Error parsing event data:", parseError);
          }
        };
        eventSource.onerror = error => {
          if (!isResolved) {
            console.error("Terjadi kesalahan pada EventSource:", error);
            clearTimeout(timeoutId);
            eventSource.close();
            isResolved = true;
            reject(new Error("EventSource error: " + (error.message || "Unknown error")));
          }
        };
        eventSource.onopen = () => {
          console.log("EventSource connection opened");
        };
      });
    } catch (error) {
      console.error("Terjadi kesalahan dalam metode chat:", error.message);
      if (error.response) {
        throw new Error(`HTTP Error ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error("Network Error: Tidak dapat menghubungi server");
      } else {
        throw error;
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const deepSeek = new DeepseekChat();
    const response = await deepSeek.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}