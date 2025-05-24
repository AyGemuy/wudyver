import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import https from "https";
class UnblurAI {
  constructor() {
    this.apiBase = "https://api.unblurimage.ai/api";
    this.endpoints = {
      UNBLUR: "/imgupscaler/v2/ai-image-unblur/create-job",
      UPSCALE: "/imgupscaler/v2/ai-image-upscale/create-job",
      MILD: "/imgupscaler/v2/ai-image-mild-unblur/create-job",
      STATUS: "/imgupscaler/v2/ai-image-unblur/get-job"
    };
    this.headers = {
      "product-code": "067003",
      "product-serial": `device-${Date.now()}-${Math.random().toString(36).slice(7)}`,
      accept: "*/*",
      "user-agent": "Postify/1.0.0"
    };
  }
  async fetchImageBuffer(imageURL) {
    console.log(`[INFO] Mengunduh gambar dari: ${imageURL}`);
    try {
      const {
        data
      } = await axios.get(imageURL, {
        responseType: "arraybuffer",
        headers: {
          "user-agent": "Postify/1.0.0",
          accept: "image/*"
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          keepAlive: true
        }),
        timeout: 15e3
      });
      console.log("[SUCCESS] Gambar berhasil diunduh.");
      return new Blob([data], {
        type: "image/png"
      });
    } catch (error) {
      console.error(`[ERROR] Gagal mengunduh gambar: ${error.message}`);
      throw new Error("Gagal mengunduh gambar.");
    }
  }
  async processImage({
    url: imageURL,
    mode: operation = "UNBLUR",
    scaleFactor = "2"
  }) {
    if (!imageURL?.startsWith("http")) {
      console.warn("[WARNING] URL gambar tidak valid.");
      return {
        status: false,
        code: 400,
        result: {
          error: "URL tidak valid."
        }
      };
    }
    let imageBlob;
    try {
      console.log("[INFO] Memproses gambar...");
      imageBlob = await this.fetchImageBuffer(imageURL);
    } catch {
      console.error("[ERROR] Timeout saat mengunduh gambar.");
      return {
        status: false,
        code: 400,
        result: {
          error: "Timeout: Gagal mengunduh gambar."
        }
      };
    }
    const formData = new FormData();
    formData.append("original_image_file", imageBlob, "image.png");
    if (operation === "UPSCALE") {
      formData.append("scale_factor", scaleFactor);
      formData.append("upscale_type", "image-upscale");
    }
    const requestUrl = `${this.apiBase}${this.endpoints[operation]}`;
    console.log(`[INFO] Mengirim permintaan ke: ${requestUrl}`);
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await axios.post(requestUrl, formData, {
          headers: {
            ...this.headers,
            ...formData.headers
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true
          }),
          timeout: 2e4
        });
        console.log("[SUCCESS] Permintaan berhasil dikirim.");
        console.log("[LOG] Respons Data:", response.data);
        break;
      } catch (error) {
        console.warn(`[WARNING] Gagal mengirim permintaan (percobaan ${attempt + 1}): ${error.message}`);
        if (attempt === 2) return {
          status: false,
          code: 400,
          result: {
            error: "Gagal memproses gambar."
          }
        };
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
    }
    return response?.data?.result?.job_id ? await this.checkJobStatus(response.data.result.job_id, operation, scaleFactor) : {
      status: false,
      code: 400,
      result: {
        error: "Gagal mendapatkan job ID."
      }
    };
  }
  async checkJobStatus(jobId, operation, scaleFactor) {
    console.log(`[INFO] Memeriksa status job: ${jobId}`);
    let startTime = Date.now();
    const maxWaitTime = 6e4;
    const statusUrl = `${this.apiBase}${this.endpoints.STATUS}/${jobId}`;
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(statusUrl, {
          headers: this.headers,
          timeout: 5e3,
          httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false
          })
        });
        console.log("[LOG] Respons Data Status Job:", response.data);
        const jobData = response?.data;
        if (jobData?.code === 1e5 && jobData.result?.output_url?.[0]) {
          console.log("[SUCCESS] Gambar berhasil diproses.");
          return {
            status: true,
            code: 200,
            result: {
              input: jobData.result.input_url,
              output: jobData.result.output_url[0],
              job_id: jobId,
              operation: operation,
              scale_factor: operation === "UPSCALE" ? scaleFactor : null
            }
          };
        }
        if (jobData?.code !== 300006) {
          console.warn("[WARNING] Job gagal diproses atau tidak ditemukan.");
          return {
            status: false,
            code: 400,
            result: {
              error: "Job gagal atau tidak ditemukan."
            }
          };
        }
        console.log("[INFO] Job masih diproses... Menunggu 3 detik sebelum cek ulang.");
        await new Promise(resolve => setTimeout(resolve, 3e3));
      } catch (error) {
        console.warn(`[WARNING] Gagal mengambil status job: ${error.message}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2e3));
      }
    }
    console.error("[ERROR] Timeout: Server tidak merespons dalam batas waktu yang ditentukan.");
    return {
      status: false,
      code: 400,
      result: {
        error: "Timeout: Server tidak merespons."
      }
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const unblurAI = new UnblurAI();
  try {
    const data = await unblurAI.processImage(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}