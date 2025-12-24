import axios from "axios";
import FormData from "form-data";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Converter {
  constructor() {
    this.base = "https://api.imageresizer.com";
    this.authUrl = "https://api.freeconvert.com/v1/account/guest";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://imageresizer.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://imageresizer.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      }
    }));
    this.authToken = null;
  }
  _getMime(ext) {
    const types = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      html: "text/html",
      pdf: "application/pdf",
      txt: "text/plain"
    };
    return types[ext?.toLowerCase()] || "application/octet-stream";
  }
  async token() {
    try {
      console.log("🔑 Auth Guest...");
      const {
        data
      } = await this.client.get(this.authUrl);
      if (data && typeof data === "string") {
        this.authToken = data.trim();
        this.client.defaults.headers.common["Authorization"] = `Bearer ${this.authToken}`;
        console.log("✅ Token acquired");
      } else {
        throw new Error("Invalid token response format");
      }
      return this.authToken;
    } catch (e) {
      throw new Error(`Auth failed: ${e.message}`);
    }
  }
  async checkQuota() {
    try {
      console.log("📊 Checking Quota...");
      const {
        data
      } = await this.client.get(`${this.base}/daily-quota/usage-detail`);
      console.log(`ℹ️  User: ${data.userType} | Usage: ${data.usage}/${data.limit}`);
      if (data.usage >= data.limit) {
        throw new Error(`⚠️ Daily limit reached: ${data.usage}/${data.limit}`);
      }
      return data;
    } catch (e) {
      if (e.message.includes("Daily limit")) throw e;
      console.warn(`⚠️ Warning checking quota: ${e.message}, attempting to proceed...`);
    }
  }
  async up(media, fmt) {
    try {
      let finalBuffer;
      if (Buffer.isBuffer(media)) {
        finalBuffer = media;
      } else if (typeof media === "string") {
        if (media.startsWith("http")) {
          console.log(`📥 Downloading media from URL...`);
          try {
            const response = await axios.get(media, {
              responseType: "arraybuffer",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
              }
            });
            finalBuffer = Buffer.from(response.data);
            console.log(`✅ Download success (${(finalBuffer.byteLength / 1024).toFixed(2)} KB)`);
          } catch (err) {
            throw new Error(`Failed to download URL: ${err.message}`);
          }
        } else if (media.startsWith("data:") || media.length > 500 && /^[a-zA-Z0-9+/]+={0,2}$/.test(media)) {
          console.log("📦 Detected Base64 input...");
          const base64Data = media.includes(",") ? media.split(",")[1] : media;
          finalBuffer = Buffer.from(base64Data, "base64");
        } else {
          finalBuffer = Buffer.from(media);
        }
      } else {
        throw new Error("Unknown media type");
      }
      const ext = fmt ? fmt.toLowerCase() : "dat";
      const filename = `source.${ext}`;
      const mimeType = this._getMime(ext);
      console.log(`📤 Init Upload ${ext.toUpperCase()} (${(finalBuffer.byteLength / 1024).toFixed(2)} KB)...`);
      const {
        data
      } = await this.client.post(`${this.base}/tasks/import/device`, {
        filename: filename,
        size: finalBuffer.byteLength
      });
      const uploadUrl = data?.result?.form?.url;
      const params = data?.result?.form?.parameters;
      const taskId = data?.id;
      if (!uploadUrl) throw new Error("Failed to get upload URL");
      if (params) {
        const form = new FormData();
        Object.entries(params).forEach(([key, value]) => form.append(key, value));
        form.append("file", finalBuffer, {
          filename: filename,
          contentType: mimeType
        });
        await this.client.post(uploadUrl, form, {
          headers: {
            ...form.getHeaders(),
            Authorization: undefined
          }
        });
      } else {
        await this.client.put(uploadUrl, finalBuffer, {
          headers: {
            "Content-Type": mimeType,
            Authorization: undefined
          }
        });
      }
      return taskId;
    } catch (e) {
      const msg = e.response ? `${e.response.status} ${JSON.stringify(e.response.data)}` : e.message;
      throw new Error(`Upload error: ${msg}`);
    }
  }
  async task(inputId, from, to, opts) {
    try {
      console.log(`⚙️  Job: ${from?.toUpperCase() || "AUTO"} -> ${to.toUpperCase()}`);
      const payload = {
        tag: "image-converter",
        tasks: {
          convert: {
            operation: "convert",
            input: inputId,
            input_format: from || null,
            output_format: to,
            options: {
              image_dpi: 300,
              strip: true,
              ...opts
            }
          },
          export: {
            operation: "export/url",
            input: "convert"
          }
        }
      };
      const {
        data
      } = await this.client.post(`${this.base}/jobs`, payload);
      return data?.id;
    } catch (e) {
      throw new Error(`Create job failed: ${e.message}`);
    }
  }
  async wait(jobId) {
    console.log("⏳ Processing...");
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      try {
        const {
          data
        } = await this.client.get(`${this.base}/jobs/${jobId}`);
        const status = data?.status;
        if (status === "completed") {
          console.log("✅ Job Completed");
          const exportResult = data?.tasks?.find(t => t.name === "export")?.result;
          if (exportResult?.url) {
            return exportResult;
          }
          throw new Error("No result URL in export task");
        }
        if (status === "failed") {
          throw new Error(`Job failed: ${JSON.stringify(data?.error)}`);
        }
        attempts++;
        await sleep(3e3);
      } catch (e) {
        if (e.message.includes("Job failed") || e.message.includes("No result")) throw e;
        attempts++;
        await sleep(3e3);
      }
    }
    throw new Error("Timeout polling job");
  }
  async generate({
    media,
    from = "jpg",
    to = "png",
    ...rest
  }) {
    try {
      if (!media) throw new Error("Media input required");
      await this.token();
      await this.checkQuota();
      const srcId = await this.up(media, from);
      const jobId = await this.task(srcId, from, to, rest);
      const finalData = await this.wait(jobId);
      return finalData;
    } catch (e) {
      console.error("❌ ERROR:", e.message);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.media) {
    return res.status(400).json({
      error: "Parameter 'media' diperlukan"
    });
  }
  const api = new Converter();
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