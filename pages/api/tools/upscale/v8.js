import axios from "axios";
import {
  FormData
} from "formdata-node";
import {
  EventSource
} from "eventsource";
class ImageProcessor {
  constructor() {
    this.sessionHash = this.generateSessionHash();
    this.uploadPath = "";
    this.eventId = "";
  }
  generateSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({
      length: 12
    }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  }
  async fetchImageAsBlob(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      return new Blob([buffer], {
        type: response.headers["content-type"]
      });
    } catch (error) {
      throw error;
    }
  }
  async fetchImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async uploadFile(blob) {
    try {
      const form = new FormData();
      form.append("files", blob, "image.jpg");
      const response = await axios.post("https://sczhou-codeformer.hf.space/upload?upload_id=gldaifydh3i", form, {
        headers: {
          accept: "*/*",
          "user-agent": "Mozilla/5.0"
        }
      });
      this.uploadPath = response.data[0];
    } catch (error) {
      throw error;
    }
  }
  async joinQueue(blob, settings) {
    try {
      const payload = {
        data: [{
          path: this.uploadPath,
          url: `https://sczhou-codeformer.hf.space/file=${this.uploadPath}`,
          orig_name: "image.jpg",
          size: blob.size,
          mime_type: blob.type,
          meta: {
            _type: "gradio.FileData"
          }
        }, ...settings],
        event_data: null,
        fn_index: 0,
        trigger_id: 16,
        session_hash: this.sessionHash
      };
      const response = await axios.post("https://sczhou-codeformer.hf.space/queue/join?", payload, {
        headers: {
          "content-type": "application/json",
          accept: "*/*"
        }
      });
      this.eventId = response.data.event_id;
    } catch (error) {
      throw error;
    }
  }
  monitorProgress() {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`https://sczhou-codeformer.hf.space/queue/data?session_hash=${this.sessionHash}`);
      eventSource.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.msg === "estimation") {
          console.log(`Queue Position: ${data.rank}, Queue Size: ${data.queue_size}`);
        } else if (data.msg === "process_starts") {
          console.log("Processing started. ETA:", data.eta);
        } else if (data.msg === "process_completed") {
          const outputUrl = data.output.data[0].url;
          eventSource.close();
          resolve(outputUrl);
        } else if (data.msg === "close_stream") {
          eventSource.close();
          resolve(null);
        }
      };
      eventSource.onerror = error => {
        eventSource.close();
        reject(error);
      };
    });
  }
  async process(url, settings = {
    pre_face: true,
    bg_enhance: true,
    face_upsample: true,
    scale: 2,
    quality: .5
  }) {
    try {
      const blob = await this.fetchImageAsBlob(url);
      await this.uploadFile(blob);
      await this.joinQueue(blob, Object.values(settings));
      const result = await this.monitorProgress();
      return await this.fetchImageBuffer(result);
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  const defaultParams = {
    pre_face: true,
    bg_enhance: true,
    face_upsample: true,
    scale: 2,
    quality: .5
  };
  try {
    const processor = new ImageProcessor();
    const result = await processor.process(url, {
      ...defaultParams,
      ...params
    });
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result));
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}