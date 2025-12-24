import axios from "axios";
import {
  EventSource
} from "eventsource";
class Rmbg {
  constructor() {
    this.session_hash = Math.random().toString(36).slice(2);
  }
  async uploadImage(imageUrl, imageName) {
    const payload = {
      data: [{
        meta: {
          _type: "gradio.FileData"
        },
        path: imageUrl,
        url: imageUrl,
        orig_name: imageName,
        size: null,
        mime_type: "image/jpeg"
      }],
      event_data: null,
      fn_index: 0,
      trigger_id: 13,
      session_hash: this.session_hash
    };
    const config = {
      method: "POST",
      url: "https://briaai-bria-rmbg-2-0.hf.space/queue/join",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Content-Type": "application/json",
        accept: "*/*",
        referer: "https://hypic.app/",
        origin: "https://hypic.app"
      },
      data: JSON.stringify(payload)
    };
    try {
      const response = await axios.request(config);
      return response.data.event_id;
    } catch (error) {
      throw new Error("Upload error: " + error.message);
    }
  }
  async cekStatus(event_id) {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`https://briaai-bria-rmbg-2-0.hf.space/queue/data?session_hash=${this.session_hash}`);
      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.event_id === event_id) {
            if (data.msg === "process_completed") {
              resolve(data.output.data);
              eventSource.close();
            } else if (data.msg === "error") {
              reject(new Error("Processing error"));
              eventSource.close();
            }
          }
        } catch (error) {
          reject(new Error("Parsing error"));
        }
      };
      eventSource.onerror = err => {
        reject(err);
        eventSource.close();
      };
    });
  }
  async removeBg({
    imageUrl
  }) {
    try {
      const event_id = await this.uploadImage(imageUrl, this.session_hash + ".jpg");
      const outputData = await this.cekStatus(event_id);
      return outputData;
    } catch (error) {
      throw new Error("Error: " + error.message);
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
    const api = new Rmbg();
    const result = await api.removeBg(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}