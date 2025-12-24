import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import {
  v4 as uuidv4
} from "uuid";
import SpoofHead from "@/lib/spoof-head";
class Any2TextConverter {
  constructor() {
    this.baseUrl = "https://any2text.com";
    this.uploadEndpoint = `${this.baseUrl}/api/files/upload`;
    this.transcribeEndpoint = `${this.baseUrl}/api/files/transcribe`;
    this.statusEndpoint = `${this.baseUrl}/api/files/status`;
    this.pageUrl = `${this.baseUrl}/audio-to-text`;
    this.cookies = {};
    this.xsrfToken = null;
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: this.baseUrl,
      referer: this.pageUrl,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      ...SpoofHead()
    };
  }
  async initSession() {
    try {
      console.log("[+] Initializing session...");
      const res = await axios.get(this.pageUrl);
      const setCookieHeaders = res.headers["set-cookie"] || [];
      for (const cookie of setCookieHeaders) {
        const [nameValue] = cookie.split(";");
        const [name, value] = nameValue.trim().split("=");
        this.cookies[name] = value;
        if (name === "XSRF-TOKEN") {
          this.xsrfToken = decodeURIComponent(value);
        }
      }
      if (!this.xsrfToken) {
        const $ = cheerio.load(res.data);
        this.xsrfToken = $('meta[name="csrf-token"]').attr("content");
      }
      console.log("[+] Session initialized", this.xsrfToken);
    } catch (err) {
      console.error("[-] Failed to initialize session:", err.message);
      throw err;
    }
  }
  getCookieString() {
    return Object.entries(this.cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  async toBuffer(input) {
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        return Buffer.from(input.split(",")[1], "base64");
      } else if (input.startsWith("http://") || input.startsWith("https://")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
    }
    throw new Error("Unsupported input. Must be Buffer, base64 string, or URL.");
  }
  async uploadFile(buffer, filename = "audio.mp3") {
    try {
      console.log("[+] Uploading file...");
      const dzuuid = uuidv4();
      const totalSize = buffer.length;
      const form = new FormData();
      form.append("dzuuid", dzuuid);
      form.append("dzchunkindex", "0");
      form.append("dztotalfilesize", totalSize.toString());
      form.append("dzchunksize", "50000000");
      form.append("dztotalchunkcount", "1");
      form.append("dzchunkbyteoffset", "0");
      form.append("file", buffer, {
        filename: filename,
        contentType: "application/octet-stream"
      });
      const headers = {
        ...form.getHeaders(),
        ...this.headers,
        cookie: this.getCookieString()
      };
      const res = await axios.post(this.uploadEndpoint, form, {
        headers: headers
      });
      const response = res.data;
      if (response?.status?.code === 200 && response?.data?.path) {
        console.log("[✓] File uploaded successfully:", response.data.path);
        return response.data.path;
      }
      console.error("[-] Upload failed:", response);
      throw new Error(response?.status?.message || "Upload failed");
    } catch (err) {
      if (err.response) {
        console.error("[-] Upload failed: HTTP", err.response.status);
        console.error("[-] Response:", err.response.data);
      } else {
        console.error("[-] Upload failed:", err.message);
      }
      throw err;
    }
  }
  async transcribeFile(filePath, {
    language,
    speakers,
    maxLineCount,
    maxLineWidth
  }) {
    try {
      console.log("[+] Starting transcription...");
      const data = new URLSearchParams({
        "files[]": filePath,
        "options[language]": language,
        "options[speakers]": speakers,
        "options[maxLineCount]": maxLineCount.toString(),
        "options[maxLineWidth]": maxLineWidth.toString(),
        addToQueue: "1"
      });
      const headers = {
        ...this.headers,
        "content-type": "application/x-www-form-urlencoded",
        cookie: this.getCookieString(),
        "x-xsrf-token": this.xsrfToken
      };
      const res = await axios.post(this.transcribeEndpoint, data, {
        headers: headers
      });
      const response = res.data;
      if (response?.redirect) {
        const match = response.redirect.match(/\/files\/(\d+)/);
        if (match) {
          const id = match[1];
          console.log("[✓] Transcription job queued, ID:", id);
          return id;
        }
      }
      if (response?.id) {
        console.log("[✓] Transcription job queued, ID:", response.id);
        return response.id;
      }
      throw new Error("Transcription failed - no job ID returned");
    } catch (err) {
      console.error("[-] Transcription failed:", err.message);
      throw err;
    }
  }
  async checkStatus(jobId) {
    const data = new URLSearchParams({
      "id[]": jobId
    });
    const headers = {
      ...this.headers,
      "content-type": "application/x-www-form-urlencoded",
      cookie: this.getCookieString(),
      "x-xsrf-token": this.xsrfToken
    };
    const res = await axios.post(this.statusEndpoint, data, {
      headers: headers
    });
    return res.data;
  }
  async waitForCompletion(jobId, maxWaitTime = 3e5, interval = 5e3) {
    console.log("[+] Waiting for transcription to complete...");
    const start = Date.now();
    while (Date.now() - start < maxWaitTime) {
      try {
        const status = await this.checkStatus(jobId);
        const job = status?.data?.[0];
        if (job) {
          console.log(`[+] Status: ${job.status} (${job.progress}%)`);
          if (job.status === "completed") {
            console.log("[✓] Transcription completed!");
            const res = await axios.get(`${this.baseUrl}/files/${jobId}`, {
              headers: {
                ...this.headers,
                cookie: this.getCookieString()
              }
            });
            const $ = cheerio.load(res.data);
            const paragraphs = $("#my-files-results p").map((i, el) => $(el).text().trim()).get();
            const transcript = paragraphs.join("\n");
            return {
              ...job,
              transcript: transcript
            };
          }
          if (job.status === "failed" || job.error) {
            throw new Error(`Failed: ${job.error || "Unknown error"}`);
          }
        }
      } catch (err) {
        console.error("[-] Error checking status:", err.message);
      }
      await new Promise(res => setTimeout(res, interval));
    }
    throw new Error("Transcription timed out");
  }
  async generate({
    input,
    filename = "audio.mp3",
    language = "auto",
    speakers = "auto",
    maxLineCount = 2,
    maxLineWidth = 35
  }) {
    try {
      await this.initSession();
      const buffer = await this.toBuffer(input);
      const filePath = await this.uploadFile(buffer, filename);
      const jobId = await this.transcribeFile(filePath, {
        language: language,
        speakers: speakers,
        maxLineCount: maxLineCount,
        maxLineWidth: maxLineWidth
      });
      const result = await this.waitForCompletion(jobId);
      return {
        success: true,
        transcript: result.transcript || result.text,
        jobId: jobId,
        filePath: filePath,
        result: result
      };
    } catch (err) {
      console.error("[-] Conversion failed:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new Any2TextConverter();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}