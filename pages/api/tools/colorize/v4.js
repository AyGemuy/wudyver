import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class ImageColorizer {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.devId = crypto.randomBytes(16).toString("hex");
    this.cfg = {
      base: "https://repair.easeus.com/fixo-api/v2/ai_image",
      hdrs: {
        accept: "application/json",
        "client-name": "fixo",
        "client-type": "web",
        "device-platform": "Linux,Chrome",
        "device-type": "web",
        deviceid: this.devId,
        lang: "en",
        language: "en-US",
        origin: "https://repair.easeus.com",
        referer: "https://repair.easeus.com/image-colorize/",
        site: "repair.easeus.com",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      }
    };
  }
  slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }
  sig(ts) {
    return this.md5(`${ts}fixo${this.devId}`);
  }
  async getBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith?.("http")) {
        console.log("[Process] Downloading image from URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const raw = input?.includes?.("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(raw || "", "base64");
    } catch (e) {
      throw new Error(`Gagal resolve buffer: ${e.message}`);
    }
  }
  async pre(key, hash) {
    try {
      console.log("[Process] Requesting S3 upload URL...");
      const ts = Math.floor(Date.now() / 1e3);
      const res = await this.api.post(`${this.cfg.base}/query_upload_urls`, {
        params: [{
          key: key,
          value: hash
        }]
      }, {
        headers: {
          ...this.cfg.hdrs,
          timestamp: ts,
          sign: this.sig(ts)
        }
      });
      return res?.data?.data?.[0] || null;
    } catch (e) {
      throw new Error(`Pre-upload failed: ${e.message}`);
    }
  }
  async put(url, buf) {
    try {
      console.log("[Process] Uploading raw data to S3 storage...");
      await axios.put(url, buf, {
        headers: {
          "Content-Type": "image/webp"
        }
      });
      return true;
    } catch (e) {
      throw new Error(`S3 Upload failed: ${e.message}`);
    }
  }
  async cre(url, name, size) {
    try {
      console.log("[Process] Registering AI Task...");
      const ts = Math.floor(Date.now() / 1e3);
      const body = {
        type: 2,
        urls: [url],
        prompt: "",
        aspect: "1:1",
        file_name: name || "image.webp",
        file_size: size,
        prompt_plugins: [""]
      };
      const res = await this.api.post(`${this.cfg.base}/create`, body, {
        headers: {
          ...this.cfg.hdrs,
          timestamp: ts,
          sign: this.sig(ts)
        }
      });
      return res?.data?.data || null;
    } catch (e) {
      throw new Error(`Task creation failed: ${e.message}`);
    }
  }
  async str(taskId) {
    try {
      console.log(`[Process] Starting AI process for Task: ${taskId}`);
      const ts = Math.floor(Date.now() / 1e3);
      const res = await this.api.post(`${this.cfg.base}/start`, {
        task_id: String(taskId)
      }, {
        headers: {
          ...this.cfg.hdrs,
          timestamp: ts,
          sign: this.sig(ts)
        }
      });
      return res?.data || null;
    } catch (e) {
      throw new Error(`Start process failed: ${e.message}`);
    }
  }
  async que(taskId) {
    try {
      const ts = Math.floor(Date.now() / 1e3);
      const res = await this.api.post(`${this.cfg.base}/query`, {
        taskids: [String(taskId)]
      }, {
        headers: {
          ...this.cfg.hdrs,
          timestamp: ts,
          sign: this.sig(ts)
        }
      });
      return res?.data?.data?.[0] || null;
    } catch (e) {
      return null;
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("[Process] Initiating EaseUS AI Image Colorizer...");
      const buf = await this.getBuf(imageUrl);
      const hash = this.md5(buf);
      const ts = Date.now();
      const fileName = `${hash}_${ts}.webp`;
      const s3Key = `pro/${this.devId}/${fileName}`;
      const uploadInfo = await this.pre(s3Key, hash);
      if (!uploadInfo?.upload_url) throw new Error("Could not get upload URL");
      await this.put(uploadInfo.upload_url, buf);
      const task = await this.cre(uploadInfo.download_url, fileName, buf.length);
      if (!task?.id) throw new Error("Task registration failed");
      const startStatus = await this.str(task.id);
      if (startStatus?.code !== 200) console.log("[Warn] Start command might have issues");
      console.log(`[Process] Task ID ${task.id} is running. Polling...`);
      for (let i = 0; i < 60; i++) {
        await this.slp(3e3);
        const status = await this.que(task.id);
        const progress = status?.progress ?? 0;
        if (status?.status === "Completed") {
          console.log("[Process] AI Colorization Success!");
          return {
            result: status.download_url || status.preview_url,
            ...status
          };
        }
        if (status?.status === "Failed") {
          throw new Error("AI Engine reported a failure");
        }
        console.log(`[Process] Polling ${i + 1}/60: Progress ${progress}%`);
      }
      throw new Error("Polling timed out after 3 minutes");
    } catch (error) {
      console.error("[Error]", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new ImageColorizer();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}