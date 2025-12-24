import axios from "axios";
import https from "https";
import FormData from "form-data";
import crypto from "crypto";
class EzEnhance {
  constructor() {
    this.agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    });
    this.baseHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://ezremove.ai",
      pragma: "no-cache",
      priority: "u=1, i",
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
    console.log(`[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${msg}`);
  }
  getSerial() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `browser_${timestamp}_${randomStr}`;
  }
  async getBuf(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string" && source.startsWith("http")) {
        const res = await axios.get(source, {
          responseType: "arraybuffer",
          httpsAgent: this.agent
        });
        return Buffer.from(res.data);
      }
      throw new Error("Invalid image source");
    } catch (e) {
      throw new Error(`Gagal mengunduh gambar: ${e.message}`);
    }
  }
  async createJob(imageBuffer, mode, extraParams = null) {
    const url = `https://api.ezremove.ai/api/ez-remove/ai-enhance/create-job`;
    const form = new FormData();
    const filename = `${crypto.randomBytes(8).toString("hex")}.jpg`;
    form.append("original_image_file", imageBuffer, {
      filename: filename,
      contentType: "image/jpeg"
    });
    form.append("model", mode);
    if (extraParams && Object.keys(extraParams).length > 0) {
      form.append("params", JSON.stringify(extraParams));
    }
    try {
      const headers = {
        ...this.baseHeaders,
        "product-serial": this.getSerial(),
        ...form.getHeaders()
      };
      const response = await axios.post(url, form, {
        headers: headers,
        httpsAgent: this.agent
      });
      const data = response.data;
      if (data.code === 1e5 && data.result?.job_id) {
        return data.result.job_id;
      }
      throw new Error(data.message?.en || "Gagal membuat job enhance.");
    } catch (e) {
      throw e;
    }
  }
  async pollJob(jobId) {
    const url = `https://api.ezremove.ai/api/ez-remove/ai-enhance/get-job/${jobId}`;
    const headers = {
      ...this.baseHeaders,
      "product-serial": this.getSerial()
    };
    this.log(`Menunggu hasil Job ID: ${jobId}`);
    for (let i = 0; i < 60; i++) {
      try {
        const response = await axios.get(url, {
          headers: headers,
          httpsAgent: this.agent
        });
        const data = response.data;
        if (data.code === 1e5 && data.result) {
          const {
            status,
            output,
            error
          } = data.result;
          if (status === 2) {
            this.log("Proses Selesai!");
            return output;
          } else if (status === -1 || error && error.length > 0) {
            throw new Error(`Job Gagal: ${error}`);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 3e3));
      } catch (e) {
        this.log(`Polling error: ${e.message}`, "warn");
      }
    }
    throw new Error("Timeout: Proses terlalu lama.");
  }
  async generate({
    imageUrl,
    mode = "enhance",
    ...rest
  }) {
    try {
      if (!imageUrl) throw new Error("Parameter 'imageUrl' wajib diisi.");
      const validModes = ["unblur", "enhance", "old_photo", "portrait", "upscale"];
      if (!validModes.includes(mode)) {
        throw new Error(`Mode tidak valid. Pilihan: ${validModes.join(", ")}`);
      }
      let defaultParams = {};
      if (mode === "old_photo") {
        defaultParams = {
          tone: "colorize"
        };
      } else if (mode === "upscale") {
        defaultParams = {
          model_type: "fast"
        };
      }
      const finalParams = {
        ...defaultParams,
        ...rest
      };
      const startT = Date.now();
      this.log(`Mengunduh gambar...`);
      const buffer = await this.getBuf(imageUrl);
      this.log(`Memulai mode: ${mode.toUpperCase()} dengan params: ${JSON.stringify(finalParams)}`);
      const jobId = await this.createJob(buffer, mode, finalParams);
      const result = await this.pollJob(jobId);
      return {
        status: true,
        mode: mode,
        job_id: jobId,
        result: result,
        process_time: `${((Date.now() - startT) / 1e3).toFixed(2)}s`
      };
    } catch (e) {
      this.log(e.message, "error");
      return {
        status: false,
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
  const api = new EzEnhance();
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