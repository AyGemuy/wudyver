import axios from "axios";
import FormData from "form-data";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class CloudConvert {
  constructor() {
    this.apiUrl = "https://api.cloudconvert.com/v2";
    this.webUrl = "https://cloudconvert.com";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        Referer: "https://cloudconvert.com/",
        Origin: "https://cloudconvert.com"
      }
    }));
    this.xsrfToken = null;
  }
  _getMime(ext) {
    const types = {
      jpg: "image/jpeg",
      png: "image/png",
      html: "text/html",
      pdf: "application/pdf",
      txt: "text/plain",
      mp4: "video/mp4",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      webp: "image/webp",
      gif: "image/gif"
    };
    return types[ext?.toLowerCase()] || "application/octet-stream";
  }
  async refreshSession() {
    try {
      console.log("🔑 Refreshing Session...");
      await this.client.get(`${this.webUrl}/session`);
      const cookieString = await this.jar.getCookieString(this.webUrl);
      const xsrfMatch = cookieString.match(/XSRF-TOKEN=([^;]+)/);
      if (!xsrfMatch) throw new Error("XSRF-TOKEN not found in cookies");
      this.xsrfToken = decodeURIComponent(xsrfMatch[1]);
      this.client.defaults.headers.common["x-xsrf-token"] = this.xsrfToken;
      console.log("✅ Session Valid");
      return true;
    } catch (e) {
      throw new Error(`Session Failed: ${e.message}`);
    }
  }
  async createJob(from, to, options = {}) {
    console.log(`⚙️ Creating Job: ${from} -> ${to}`);
    try {
      const payload = {
        tag: "webinterface",
        tasks: {
          "import-1": {
            operation: "import/upload"
          },
          [`convert-${to}`]: {
            input: ["import-1"],
            operation: "convert",
            input_format: from,
            output_format: to,
            ...options
          },
          export: {
            input: `convert-${to}`,
            operation: "export/url",
            inline_additional: true,
            archive_multiple_files: true
          }
        }
      };
      const {
        data
      } = await this.client.post(`${this.apiUrl}/jobs`, payload);
      console.log("✅ Job Created ID:", data.data.id);
      return data.data;
    } catch (e) {
      console.error("❌ Failed to create job:", e.message);
      throw e;
    }
  }
  async upload(uploadTask, buffer, filename, mime) {
    console.log(`📤 Uploading to S3 (${(buffer.length / 1024).toFixed(2)} KB)...`);
    const {
      url,
      parameters
    } = uploadTask.result.form;
    const form = new FormData();
    Object.entries(parameters).forEach(([k, v]) => form.append(k, v));
    form.append("file", buffer, {
      filename: filename,
      contentType: mime
    });
    const {
      data
    } = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        "Content-Length": form.getLengthSync()
      },
      maxRedirects: 0
    });
    console.log("✅ Upload Success");
    return data;
  }
  async waitForCompletion(jobId) {
    console.log("⏳ Waiting for job completion (Polling Mode)...");
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100;
      const checkStatus = async () => {
        try {
          attempts++;
          const {
            data
          } = await this.client.get(`${this.apiUrl}/jobs/${jobId}`);
          const job = data.data;
          const exportTask = job.tasks.find(t => t.operation === "export/url");
          const convertTask = job.tasks.find(t => t.operation === "convert");
          if (convertTask && convertTask.status === "processing") {}
          if (job.status === "finished") {
            clearInterval(interval);
            if (exportTask?.result?.files?.[0]) {
              const file = exportTask.result.files[0];
              resolve(file);
            } else {
              reject(new Error("Output URL not found"));
            }
          } else if (job.status === "error") {
            clearInterval(interval);
            const errorTask = job.tasks.find(t => t.status === "error");
            reject(new Error(`Job Failed: ${errorTask?.message || "Unknown error"}`));
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error("Timeout waiting for job"));
          }
        } catch (e) {}
      };
      const interval = setInterval(checkStatus, 3e3);
      checkStatus();
    });
  }
  async generate({
    media,
    from = "jpg",
    to = "png",
    ...rest
  }) {
    try {
      if (!media) throw new Error("Media input required");
      await this.refreshSession();
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
      const job = await this.createJob(from, to, rest);
      const importTask = job.tasks.find(t => t.name === "import-1");
      await this.upload(importTask, finalBuffer, `input.${from}`, this._getMime(from));
      const result = await this.waitForCompletion(job.id);
      return result;
    } catch (e) {
      console.error("❌ CloudConvert Error:", e.message);
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
  const api = new CloudConvert();
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