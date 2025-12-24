import axios from "axios";
import https from "https";
import FormData from "form-data";
import crypto from "crypto";
class EzAi {
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
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);
  }
  getSerial() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `browser_${timestamp}_${randomStr}`;
  }
  async getBuf(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
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
  async createJob(payload, apiPath) {
    const url = `https://api.ezremove.ai/api/ez-remove/${apiPath}/create-job`;
    const {
      prompt,
      imageUrl,
      model_name,
      ratio,
      resolution
    } = payload;
    const form = new FormData();
    let defaultModel = "nano_banana";
    if (apiPath === "photo-editor") defaultModel = "ezremove_3.0";
    form.append("model_name", model_name || defaultModel);
    form.append("prompt", prompt);
    const hasImage = imageUrl && (Array.isArray(imageUrl) ? imageUrl.length > 0 : true);
    const defaultRatio = hasImage ? "match_input_image" : "1:1";
    form.append("ratio", ratio || defaultRatio);
    form.append("image_resolution", resolution || "1K");
    if (hasImage) {
      const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      this.log(`[${apiPath}] Processing ${images.length} image(s)...`);
      for (const img of images) {
        try {
          const buffer = await this.getBuf(img);
          const filename = `${crypto.randomBytes(8).toString("hex")}.jpg`;
          form.append("target_images", buffer, {
            filename: filename,
            contentType: "image/jpeg"
          });
        } catch (err) {
          this.log(`Skipping failed image: ${err.message}`, "warn");
        }
      }
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
      throw new Error(data.message?.en || "Failed to create job");
    } catch (e) {
      throw e;
    }
  }
  async pollJob(jobId, apiPath) {
    const url = `https://api.ezremove.ai/api/ez-remove/${apiPath}/get-job/${jobId}`;
    const headers = {
      ...this.baseHeaders,
      "product-serial": this.getSerial()
    };
    this.log(`Polling Job ID: ${jobId} (${apiPath})`);
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
            this.log("Job Completed Successfully!");
            return output;
          } else if (status === -1 || error && error.length > 0) {
            throw new Error(`Job Failed: ${error || "Unknown error"}`);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 3e3));
      } catch (e) {
        this.log(`Polling Error: ${e.message}`, "error");
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    mode = "ai-models",
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      let apiPath = mode === "photo-editor" || mode === "editor" ? "photo-editor" : "ai-models";
      const startT = Date.now();
      this.log(`Starting Task [${apiPath}]: "${prompt}"`);
      const jobId = await this.createJob({
        prompt: prompt,
        imageUrl: imageUrl,
        ...rest
      }, apiPath);
      this.log(`Job Created: ${jobId}`);
      const output = await this.pollJob(jobId, apiPath);
      return {
        status: true,
        mode: apiPath,
        jobId: jobId,
        result: output,
        processTime: `${((Date.now() - startT) / 1e3).toFixed(2)}s`
      };
    } catch (e) {
      this.log(e.message, "error");
      return {
        status: false,
        mode: mode,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new EzAi();
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