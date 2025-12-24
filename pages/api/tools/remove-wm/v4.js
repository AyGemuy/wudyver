import axios from "axios";
import https from "https";
import FormData from "form-data";
import crypto from "crypto";
class EzRemove {
  constructor() {
    this.agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    });
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://ezremove.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      "product-serial": crypto.randomBytes(8).toString("hex"),
      referer: "https://ezremove.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);
  }
  async getBuf(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          this.log("Fetching image from URL...");
          const res = await axios.get(source, {
            responseType: "arraybuffer",
            httpsAgent: this.agent
          });
          return Buffer.from(res.data);
        }
        const base64 = source.includes("base64") ? source.split(",").pop() : source;
        return Buffer.from(base64, "base64");
      }
      throw new Error("Invalid source type");
    } catch (e) {
      throw new Error(`Buffer conversion failed: ${e.message}`);
    }
  }
  async createJob(buffer) {
    this.log("Creating Removal Job...");
    const url = "https://api.ezremove.ai/api/ez-remove/watermark-remove/create-job";
    const form = new FormData();
    const filename = `${crypto.randomBytes(8).toString("hex")}.jpg`;
    form.append("image_file", buffer, {
      filename: filename,
      contentType: "image/jpeg"
    });
    try {
      const response = await axios.post(url, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        },
        httpsAgent: this.agent
      });
      const data = response.data;
      if (data.code === 1e5 && data.result?.job_id) {
        this.log(`Job Created. ID: ${data.result.job_id}`);
        return data.result.job_id;
      }
      throw new Error(data.message?.en || "Failed to create job");
    } catch (e) {
      this.log(`Create Job Error: ${e.message}`, "error");
      throw e;
    }
  }
  async pollJob(jobId) {
    this.log(`Polling Job Result: ${jobId}`);
    const url = `https://api.ezremove.ai/api/ez-remove/watermark-remove/get-job/${jobId}`;
    for (let i = 0; i < 60; i++) {
      try {
        const response = await axios.get(url, {
          headers: this.headers,
          httpsAgent: this.agent
        });
        const data = response.data;
        if (data.code === 1e5) {
          if (data.result?.output && data.result.output.length > 0) {
            this.log("Job Completed!");
            return data.result.output[0];
          }
        }
        if (data.code !== 1e5) {}
        await new Promise(resolve => setTimeout(resolve, 3e3));
      } catch (e) {
        this.log(`Polling Error: ${e.message}`, "error");
      }
    }
    throw new Error("Polling timeout or failed to retrieve result.");
  }
  async generate({
    imageUrl: source
  }) {
    try {
      const startT = Date.now();
      const buffer = await this.getBuf(source);
      const jobId = await this.createJob(buffer);
      const resultUrl = await this.pollJob(jobId);
      return {
        status: true,
        result: resultUrl,
        jobId: jobId,
        processTime: `${((Date.now() - startT) / 1e3).toFixed(2)}s`
      };
    } catch (e) {
      this.log(e.message, "error");
      return {
        status: false,
        result: null,
        error: e.message
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
  const api = new EzRemove();
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