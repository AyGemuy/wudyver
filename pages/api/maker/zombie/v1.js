import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
class ZombieGenerator {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://makemeazombie.com",
      priority: "u=1, i",
      referer: "https://makemeazombie.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.host = null;
    this.hash = this.genHash();
    this.eventSource = null;
    this.modeMap = {
      1: "Classic",
      2: "In Place"
    };
  }
  genHash() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  async getHost() {
    try {
      console.log("🔍 Getting host...");
      const res = await axios.get("https://huggingface.co/api/spaces/jbrownkramer/makemeazombie/host", {
        headers: this.headers
      });
      this.host = res.data?.host;
      console.log("✅ Host:", this.host);
      return this.host;
    } catch (err) {
      console.error("❌ Host error:", err.message);
      throw new Error(`Host failed: ${err.message}`);
    }
  }
  async toBlob(img) {
    try {
      if (img.startsWith("data:")) {
        console.log("📝 Base64 to blob...");
        const data = img.split(",")[1];
        const mime = img.split(";")[0].split(":")[1];
        const buf = Buffer.from(data, "base64");
        return {
          buf: buf,
          mime: mime
        };
      } else {
        console.log("🌐 URL to blob...");
        const res = await axios.get(img, {
          responseType: "arraybuffer",
          headers: {
            "user-agent": this.headers["user-agent"]
          }
        });
        const buf = Buffer.from(res.data);
        const mime = res.headers["content-type"] || "application/octet-stream";
        return {
          buf: buf,
          mime: mime
        };
      }
    } catch (err) {
      console.error("❌ Blob error:", err.message);
      throw new Error(`Blob failed: ${err.message}`);
    }
  }
  async upload(img) {
    try {
      if (!this.host) await this.getHost();
      console.log("📤 Uploading...");
      const {
        buf,
        mime
      } = await this.toBlob(img);
      const form = new FormData();
      form.append("files", buf, {
        filename: "blob",
        contentType: mime
      });
      const res = await axios.post(`${this.host}/gradio_api/upload`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          "sec-fetch-storage-access": "none"
        }
      });
      const path = res.data?.[0];
      console.log("✅ Uploaded:", path);
      return path;
    } catch (err) {
      console.error("❌ Upload error:", err.message);
      throw new Error(`Upload failed: ${err.message}`);
    }
  }
  async join(path, mode = 1) {
    try {
      const modeName = this.modeMap[mode] || "In Place";
      console.log(`🚀 Joining queue with mode: ${modeName}...`);
      const data = {
        data: [{
          path: path,
          meta: {
            _type: "gradio.FileData"
          }
        }, modeName, "zombie"],
        event_data: null,
        fn_index: 2,
        trigger_id: null,
        session_hash: this.hash
      };
      const res = await axios.post(`${this.host}/gradio_api/queue/join?`, data, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          "sec-fetch-storage-access": "none"
        }
      });
      const id = res.data?.event_id;
      console.log("✅ Queue joined:", id);
      return id;
    } catch (err) {
      console.error("❌ Queue error:", err.message);
      throw new Error(`Queue failed: ${err.message}`);
    }
  }
  async process(id) {
    return new Promise((resolve, reject) => {
      try {
        console.log("👂 Listening...");
        this.eventSource = new EventSource(`${this.host}/gradio_api/queue/data?session_hash=${this.hash}`, {
          headers: {
            ...this.headers,
            accept: "text/event-stream",
            "content-type": "application/json",
            "sec-fetch-storage-access": "none"
          }
        });
        let started = false;
        let timeoutId = null;
        this.eventSource.onmessage = e => {
          try {
            const data = JSON.parse(e.data);
            console.log("📨 Event:", data.msg);
            switch (data.msg) {
              case "estimation":
                console.log(`⏳ Queue: ${data.rank}, ETA: ${data.rank_eta?.toFixed(1)}s`);
                break;
              case "process_starts":
                started = true;
                console.log(`🔄 Started, ETA: ${data.eta?.toFixed(1)}s`);
                break;
              case "process_completed":
                console.log("✅ Done!");
                const out = data.output?.data?.[0];
                if (out?.url) {
                  this.cleanup(timeoutId);
                  resolve({
                    success: true,
                    imageUrl: out.url,
                    path: out.path,
                    filename: out.orig_name,
                    mimeType: out.mime_type,
                    duration: data.output?.duration,
                    avgDuration: data.output?.average_duration
                  });
                } else {
                  this.cleanup(timeoutId);
                  reject(new Error("No output URL"));
                }
                break;
              case "close_stream":
                this.cleanup(timeoutId);
                if (!started) reject(new Error("Stream closed early"));
                break;
              default:
                console.log("ℹ️ Unknown:", data.msg);
            }
          } catch (parseErr) {
            console.error("❌ Parse error:", parseErr.message);
          }
        };
        this.eventSource.onerror = err => {
          console.error("❌ ES error:", err);
          this.cleanup(timeoutId);
          reject(new Error("EventSource failed"));
        };
        timeoutId = setTimeout(() => {
          if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
            this.cleanup(timeoutId);
            reject(new Error("Timeout (60s)"));
          }
        }, 6e4);
      } catch (err) {
        console.error("❌ ES setup error:", err.message);
        reject(err);
      }
    });
  }
  cleanup(timeoutId) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
  async generate({
    imageUrl,
    mode = 1
  }) {
    try {
      console.log("🧟 Starting...");
      await this.getHost();
      const path = await this.upload(imageUrl);
      const id = await this.join(path, mode);
      const result = await this.process(id);
      console.log("🎉 Done!");
      return result;
    } catch (err) {
      console.error("❌ Failed:", err.message);
      this.cleanup();
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const gen = new ZombieGenerator();
    const response = await gen.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}