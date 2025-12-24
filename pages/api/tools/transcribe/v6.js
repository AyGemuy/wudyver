import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class Transcriptly {
  constructor() {
    this.base = "https://transcriptly.org/api";
    this.hd = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://transcriptly.org",
      pragma: "no-cache",
      referer: "https://transcriptly.org/services/audio-to-text",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async generate({
    input,
    fileName = "audio.mp3",
    duration = 0,
    ...rest
  }) {
    try {
      console.log("Uploading...");
      const {
        fileKey,
        fileSize
      } = await this.up(input, fileName);
      console.log("Uploaded:", fileKey);
      console.log("Submitting...");
      const {
        id
      } = await this.sub(fileKey, fileName, fileSize, duration);
      console.log("Task ID:", id);
      console.log("Polling...");
      const result = await this.pol(id);
      console.log("Success");
      return result;
    } catch (e) {
      console.error("Failed:", e?.message || e);
      throw e;
    }
  }
  async up(input, fileName) {
    const form = new FormData();
    let file, size, mime;
    if (typeof input === "string" && input.startsWith("http")) {
      console.log("Fetching URL...");
      const {
        data,
        headers
      } = await axios.get(input, {
        responseType: "arraybuffer"
      });
      file = data;
      size = data.length;
      mime = headers["content-type"] || this.mime(fileName);
    } else if (Buffer.isBuffer(input)) {
      file = input;
      size = input.length;
      mime = this.mime(fileName);
    } else if (typeof input === "string" && input.startsWith("data:")) {
      const [header, b64] = input.split(",");
      file = Buffer.from(b64, "base64");
      size = file.length;
      mime = header.match(/:(.*?);/)?.[1] || this.mime(fileName);
    } else {
      throw new Error("Input: url | data:base64 | buffer");
    }
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    form.append("file", file, {
      filename: filename,
      contentType: mime || "application/octet-stream"
    });
    const res = await axios.post(`${this.base}/file/upload`, form, {
      headers: {
        ...this.hd,
        ...form.getHeaders()
      },
      maxBodyLength: Infinity
    });
    return {
      fileKey: res.data?.key || "",
      fileSize: size
    };
  }
  mime(name) {
    const ext = name.split(".").pop()?.toLowerCase();
    return {
      wav: "audio/wav",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      webm: "audio/webm",
      flac: "audio/flac",
      aac: "audio/aac"
    } [ext] || "application/octet-stream";
  }
  async sub(fileKey, fileName, fileSize, duration) {
    const res = await axios.post(`${this.base}/file/transcript`, {
      fileKey: fileKey,
      fileName: fileName,
      fileSize: fileSize,
      duration: duration || 0
    }, {
      headers: {
        ...this.hd,
        "content-type": "application/json"
      }
    });
    return {
      id: res.data?.data?.id || ""
    };
  }
  async pol(id, delay = 3e3) {
    while (true) {
      try {
        const res = await axios.get(`${this.base}/file/transcript`, {
          params: {
            id: id
          },
          headers: this.hd
        });
        const status = res.data?.data?.status || "PENDING";
        console.log("Status:", status);
        if (status === "SUCCESS") {
          const {
            fileKey,
            transcriptKey
          } = res.data.data;
          return await this.det(fileKey, transcriptKey);
        }
        if (["FAILED", "ERROR"].includes(status)) {
          throw new Error(res.data?.data?.error || "Task failed");
        }
      } catch (e) {
        console.warn("Poll:", e?.message || e);
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
  async det(fileKey, transcriptKey) {
    const res = await axios.get(`${this.base}/file/detail`, {
      params: {
        fileKey: fileKey,
        transcriptKey: transcriptKey
      },
      headers: this.hd
    });
    return res.data?.data || {};
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new Transcriptly();
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