import axios from "axios";
import FormData from "form-data";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class DragonPro {
  constructor() {
    this.baseUrl = "https://dragon.online-convert.com/api";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "https://image.online-convert.com",
        Referer: "https://image.online-convert.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      }
    }));
  }
  _uuid() {
    const t = () => Math.floor(65536 * (1 + Math.random())).toString(16).substring(1);
    return t() + t() + "-" + t() + "-" + t() + "-" + t() + "-" + t() + t() + t();
  }
  async initSession() {
    try {
      await this.client.get("https://www.online-convert.com");
      await this.client.post(`${this.baseUrl}/affiliate`, {
        fpr: null,
        ref_code: null
      }).catch(() => {});
    } catch (e) {
      console.log("Init session warning:", e.message);
    }
  }
  _detectMedia(media) {
    if (Buffer.isBuffer(media)) return {
      type: "buffer",
      data: media
    };
    if (typeof media === "string") {
      if (media.trim().startsWith("<") || /<!DOCTYPE|<html/i.test(media)) return {
        type: "html",
        data: media
      };
      if (media.startsWith("http")) return {
        type: "url",
        data: media
      };
      if (media.startsWith("data:") || /^[A-Za-z0-9+/=]+$/.test(media.replace(/\s/g, ""))) return {
        type: "base64",
        data: media.includes(",") ? media.split(",")[1] : media
      };
      return {
        type: "text",
        data: media
      };
    }
    throw new Error("Unsupported media");
  }
  async createJob(from, to) {
    const res = await this.client.post(`${this.baseUrl}/jobs?async=true`, {
      operation: `conversionpair${from}to${to}`,
      fail_on_conversion_error: false,
      fail_on_input_error: false,
      force_rs: ""
    });
    const xOpen = res.headers["x-open"];
    const satJobId = res.data.sat.id_job;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const info = await this.client.get(`${this.baseUrl}/jobs/${satJobId}?async=true`);
        if (info.data.token && info.data.server && info.data.status?.code !== "init") {
          return {
            id: info.data.id,
            satJobId: satJobId,
            token: info.data.token,
            server: info.data.server,
            xOpen: xOpen
          };
        }
      } catch (e) {
        console.log(`Retry ${i + 1}: waiting for job ready...`);
      }
    }
    throw new Error("Job initialization timeout");
  }
  async upload(job, buffer, filename, mime) {
    const form = new FormData();
    form.append("file", buffer, {
      filename: filename,
      contentType: mime
    });
    const cookies = await this.jar.getCookies("https://www.online-convert.com");
    const cookieString = cookies.map(c => `${c.key}=${c.value}`).join("; ");
    const uploadHeaders = {
      ...form.getHeaders(),
      Accept: "*/*",
      Origin: "https://image.online-convert.com",
      Referer: "https://image.online-convert.com/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "X-Oc-Token": job.token,
      "X-Oc-Upload-Uuid": this._uuid(),
      Cookie: cookieString
    };
    try {
      const {
        data
      } = await axios.post(`${job.server}/upload-file/${job.id}`, form, {
        headers: uploadHeaders,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      return data;
    } catch (error) {
      console.error("Upload failed:", error.response?.data || error.message);
      throw error;
    }
  }
  async waitInput(satJobId) {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1e3));
      try {
        const {
          data
        } = await this.client.get(`${this.baseUrl}/jobs/${satJobId}?async=true`);
        if (data.input && data.input.length > 0) {
          if (data.input[0].status === "ready") return;
        }
      } catch (e) {}
    }
    throw new Error("Input not ready timeout");
  }
  async convert(job, to) {
    const cats = {
      jpg: "image",
      png: "image",
      webp: "image",
      gif: "image",
      mp4: "video",
      pdf: "document",
      html: "document"
    };
    try {
      const {
        data
      } = await this.client.post(`${this.baseUrl}/jobs/${job.id}/conversions`, {
        category: cats[to] || "image",
        target: to,
        options: {
          allow_multiple_outputs: true,
          quality: 85,
          enhance: false,
          sharpen: false,
          antialias: true,
          despeckle: false,
          equalize: false,
          normalize: false,
          deskew: false
        },
        metadata: {
          Producer: "Online-Convert"
        }
      }, {
        headers: {
          "x-open": job.xOpen,
          "Content-Type": "application/json"
        }
      });
      console.log("Conversion response:", data);
      return data;
    } catch (error) {
      console.error("Conversion failed:", error.response?.data || error.message);
      throw error;
    }
  }
  async waitResult(satJobId) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = async () => {
        try {
          const {
            data
          } = await this.client.get(`${this.baseUrl}/jobs/${satJobId}?async=true`);
          console.log(`Status: ${data.status?.code}`);
          if (data.status?.code === "completed") {
            clearInterval(interval);
            const out = data.output?.find(o => o.status === "enabled") || data.output?.[0];
            if (out) {
              resolve({
                url: out.uri,
                filename: out.filename,
                size: out.size
              });
            } else {
              reject(new Error("No output found"));
            }
          } else if (data.status?.code === "failed") {
            clearInterval(interval);
            reject(new Error(`Conversion failed: ${JSON.stringify(data.errors || {})}`));
          } else if (++attempts > 60) {
            clearInterval(interval);
            reject(new Error("Timeout waiting for conversion"));
          }
        } catch (e) {
          if (++attempts > 60) {
            clearInterval(interval);
            reject(e);
          }
        }
      };
      const interval = setInterval(check, 3e3);
      check();
    });
  }
  async generate({
    media,
    from = "jpg",
    to = "png"
  }) {
    try {
      console.log("🔄 Initializing session...");
      await this.initSession();
      console.log("🔍 Detecting media type...");
      const info = this._detectMedia(media);
      let buffer, filename = `file.${from}`;
      if (info.type === "html") {
        buffer = Buffer.from(info.data, "utf-8");
        filename = "file.html";
        from = "html";
      } else if (info.type === "text") {
        buffer = Buffer.from(info.data, "utf-8");
        filename = "file.txt";
      } else if (info.type === "base64") {
        buffer = Buffer.from(info.data, "base64");
      } else if (info.type === "url") {
        console.log("📥 Downloading from URL...");
        const res = await axios.get(info.data, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(res.data);
      } else {
        buffer = info.data;
      }
      console.log("✨ Creating job...");
      const job = await this.createJob(from, to);
      console.log(`✅ Job created - ID: ${job.id}`);
      console.log("📤 Uploading file...");
      await this.upload(job, buffer, filename, this._getMime(from));
      console.log("✅ Upload complete");
      console.log("⏳ Waiting for input processing...");
      await this.waitInput(job.satJobId);
      console.log("✅ Input ready");
      console.log("🔄 Starting conversion...");
      await this.convert(job, to);
      console.log("⏳ Waiting for result...");
      const result = await this.waitResult(job.satJobId);
      console.log("✅ Conversion complete!");
      return result;
    } catch (e) {
      console.error("❌ Error:", e.message);
      return {
        error: e.message
      };
    }
  }
  _getMime(ext) {
    const types = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      html: "text/html",
      txt: "text/plain",
      pdf: "application/pdf"
    };
    return types[ext?.toLowerCase()] || "application/octet-stream";
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.media) {
    return res.status(400).json({
      error: "Parameter 'media' diperlukan"
    });
  }
  const api = new DragonPro();
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