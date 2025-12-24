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
      UNBLUR_CREATE: "/imgupscaler/v2/ai-image-unblur/create-job",
      UPSCALE_CREATE: "/imgupscaler/v2/ai-image-upscale/create-job",
      MILD_UNBLUR_CREATE: "/imgupscaler/v2/ai-image-mild-unblur/create-job",
      IMAGE_RESTORE_CREATE: "/imgupscaler/v2/ai-image-restore/create-job",
      IMAGE_COLORIZE_CREATE: "/imgupscaler/v2/ai-image-colorize/create-job",
      IMAGE_DENOISE_CREATE: "/imgupscaler/v1/ai-image-denoise/create-job",
      VIDEO_UPSCALE_CREATE: "/upscaler/v2/ai-video-enhancer/create-job",
      IMAGE_STATUS: "/imgupscaler/v2/ai-image-unblur/get-job",
      IMAGE_RESTORE_STATUS: "/imgupscaler/v2/ai-image-restore/get-job",
      IMAGE_COLORIZE_STATUS: "/imgupscaler/v2/ai-image-colorize/get-job",
      IMAGE_DENOISE_STATUS: "/imgupscaler/v1/ai-image-denoise/get-job",
      VIDEO_STATUS: "/upscaler/v2/ai-video-enhancer/get-job"
    };
    this.headers = {
      "product-code": "067003",
      "product-serial": `device-${Date.now()}-${Math.random().toString(36).slice(7)}`,
      accept: "*/*",
      "user-agent": "Postify/1.0.0",
      "X-Forwarded-For": this.generateRandomIp()
    };
    this.operationMap = {
      unblur: "UNBLUR",
      upscale: "UPSCALE",
      mild: "MILD",
      restore: "IMAGE_RESTORE",
      colorize: "IMAGE_COLORIZE",
      denoise: "IMAGE_DENOISE",
      video_upscale: "VIDEO_UPSCALE",
      videoupscale: "VIDEO_UPSCALE",
      image_restore: "IMAGE_RESTORE",
      imagerestore: "IMAGE_RESTORE",
      image_colorize: "IMAGE_COLORIZE",
      imagecolorize: "IMAGE_COLORIZE",
      image_denoise: "IMAGE_DENOISE",
      imagedenoise: "IMAGE_DENOISE"
    };
  }
  generateRandomIp() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 255) + 1).join(".");
  }
  getAvailableOperations() {
    const uniqueOperations = new Set(Object.values(this.operationMap));
    return [...uniqueOperations].sort();
  }
  async fetchMediaBuffer(mediaURL, type = "image") {
    console.log(`[INFO] Mengunduh ${type} dari: ${mediaURL}`);
    try {
      const {
        data
      } = await axios.get(mediaURL, {
        responseType: "arraybuffer",
        headers: {
          "user-agent": "Postify/1.0.0",
          accept: type === "image" ? "image/*" : "video/*",
          "X-Forwarded-For": this.generateRandomIp()
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          keepAlive: true
        }),
        timeout: 15e3
      });
      console.log(`[SUCCESS] ${type} berhasil diunduh.`);
      return new Blob([data], {
        type: type === "image" ? "image/png" : "video/mp4"
      });
    } catch (error) {
      console.error(`[ERROR] Gagal mengunduh ${type}: ${error.message}`);
      throw new Error(`Gagal mengunduh ${type}.`);
    }
  }
  async processMedia({
    url: mediaURL,
    mode,
    scaleFactor = "2",
    resolution = "2k",
    upscaleRestore = "2"
  }) {
    const normalizedMode = this.operationMap[mode?.toLowerCase()];
    if (!normalizedMode) {
      const availableOps = this.getAvailableOperations();
      const errorMessage = `Mode operasi tidak valid atau tidak ada: '${mode}'.\nMode yang tersedia: ${availableOps.join(", ")}`;
      console.warn(`[WARNING] ${errorMessage}`);
      return {
        status: false,
        code: 400,
        result: {
          error: errorMessage
        }
      };
    }
    if (!mediaURL?.startsWith("http")) {
      console.warn("[WARNING] URL media tidak valid.");
      return {
        status: false,
        code: 400,
        result: {
          error: "URL tidak valid."
        }
      };
    }
    let mediaBlob;
    const isVideoOperation = normalizedMode === "VIDEO_UPSCALE";
    const isImageRestoreOperation = normalizedMode === "IMAGE_RESTORE";
    const isImageColorizeOperation = normalizedMode === "IMAGE_COLORIZE";
    const isImageDenoiseOperation = normalizedMode === "IMAGE_DENOISE";
    const mediaType = isVideoOperation ? "video" : "image";
    try {
      console.log(`[INFO] Memproses ${mediaType}...`);
      mediaBlob = await this.fetchMediaBuffer(mediaURL, mediaType);
    } catch {
      console.error(`[ERROR] Timeout saat mengunduh ${mediaType}.`);
      return {
        status: false,
        code: 400,
        result: {
          error: `Timeout: Gagal mengunduh ${mediaType}.`
        }
      };
    }
    const formData = new FormData();
    let createEndpointKey;
    switch (normalizedMode) {
      case "VIDEO_UPSCALE":
        formData.append("original_video_file", mediaBlob, "video.mp4");
        formData.append("resolution", resolution);
        formData.append("is_preview", "false");
        createEndpointKey = "VIDEO_UPSCALE_CREATE";
        break;
      case "IMAGE_RESTORE":
        formData.append("original_image_file", mediaBlob, "image.png");
        formData.append("upscale", upscaleRestore);
        createEndpointKey = "IMAGE_RESTORE_CREATE";
        break;
      case "IMAGE_COLORIZE":
        formData.append("original_image_file", mediaBlob, "image.png");
        createEndpointKey = "IMAGE_COLORIZE_CREATE";
        break;
      case "IMAGE_DENOISE":
        formData.append("original_image_file", mediaBlob, "image.png");
        createEndpointKey = "IMAGE_DENOISE_CREATE";
        break;
      case "UNBLUR":
        formData.append("original_image_file", mediaBlob, "image.png");
        createEndpointKey = "UNBLUR_CREATE";
        break;
      case "UPSCALE":
        formData.append("original_image_file", mediaBlob, "image.png");
        formData.append("scale_factor", scaleFactor);
        formData.append("upscale_type", "image-upscale");
        createEndpointKey = "UPSCALE_CREATE";
        break;
      case "MILD":
        formData.append("original_image_file", mediaBlob, "image.png");
        createEndpointKey = "MILD_UNBLUR_CREATE";
        break;
      default:
        const availableOps = this.getAvailableOperations();
        const errorMessage = `Mode operasi tidak valid: '${mode}'.\nMode yang tersedia: ${availableOps.join(", ")}`;
        console.error(`[ERROR] ${errorMessage}`);
        return {
          status: false,
            code: 400,
            result: {
              error: errorMessage
            }
        };
    }
    const requestUrl = `${this.apiBase}${this.endpoints[createEndpointKey]}`;
    console.log(`[INFO] Mengirim permintaan ke: ${requestUrl}`);
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await axios.post(requestUrl, formData, {
          headers: {
            ...this.headers,
            ...formData.headers,
            "X-Forwarded-For": this.generateRandomIp()
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true
          }),
          timeout: 6e4
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
            error: `Gagal memproses ${mediaType}.`
          }
        };
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
    }
    if (response?.data?.result?.job_id) {
      return await this.checkJobStatus(response.data.result.job_id, normalizedMode, scaleFactor, resolution, upscaleRestore);
    } else {
      return {
        status: false,
        code: 400,
        result: {
          error: "Gagal mendapatkan job ID."
        }
      };
    }
  }
  async checkJobStatus(jobId, normalizedOperation, scaleFactor, resolution, upscaleRestore) {
    console.log(`[INFO] Memeriksa status job: ${jobId}`);
    let startTime = Date.now();
    const maxWaitTime = 12e4;
    const isVideoOperation = normalizedOperation === "VIDEO_UPSCALE";
    const isImageRestoreOperation = normalizedOperation === "IMAGE_RESTORE";
    const isImageColorizeOperation = normalizedOperation === "IMAGE_COLORIZE";
    const isImageDenoiseOperation = normalizedOperation === "IMAGE_DENOISE";
    let statusEndpointKey;
    switch (normalizedOperation) {
      case "VIDEO_UPSCALE":
        statusEndpointKey = "VIDEO_STATUS";
        break;
      case "IMAGE_RESTORE":
        statusEndpointKey = "IMAGE_RESTORE_STATUS";
        break;
      case "IMAGE_COLORIZE":
        statusEndpointKey = "IMAGE_COLORIZE_STATUS";
        break;
      case "IMAGE_DENOISE":
        statusEndpointKey = "IMAGE_DENOISE_STATUS";
        break;
      case "UNBLUR":
      case "UPSCALE":
      case "MILD":
        statusEndpointKey = "IMAGE_STATUS";
        break;
      default:
        const availableOps = this.getAvailableOperations();
        const errorMessage = `Mode operasi tidak valid saat memeriksa status: '${normalizedOperation}'.\nMode yang tersedia: ${availableOps.join(", ")}`;
        console.error(`[ERROR] ${errorMessage}`);
        return {
          status: false,
            code: 400,
            result: {
              error: errorMessage
            }
        };
    }
    const statusUrl = `${this.apiBase}${this.endpoints[statusEndpointKey]}/${jobId}`;
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(statusUrl, {
          headers: {
            ...this.headers,
            "X-Forwarded-For": this.generateRandomIp()
          },
          timeout: 1e4,
          httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false
          })
        });
        console.log("[LOG] Respons Data Status Job:", response.data);
        const jobData = response?.data;
        if (jobData?.code === 1e5 && jobData.result?.output_url) {
          console.log(`[SUCCESS] ${isVideoOperation ? "Video" : "Gambar"} berhasil diproses.`);
          return {
            status: true,
            code: 200,
            result: {
              input: jobData.result.input_url,
              output: isVideoOperation ? jobData.result.output_url : jobData.result.output_url[0],
              job_id: jobId,
              operation: normalizedOperation,
              scale_factor: normalizedOperation === "UPSCALE" ? scaleFactor : null,
              resolution: isVideoOperation ? resolution : null,
              upscale_restore: isImageRestoreOperation ? upscaleRestore : null
            }
          };
        }
        if (!(isVideoOperation || isImageRestoreOperation || isImageColorizeOperation || isImageDenoiseOperation) && jobData?.code !== 300006) {
          console.warn("[WARNING] Job gagal diproses atau tidak ditemukan.");
          return {
            status: false,
            code: 400,
            result: {
              error: "Job gagal atau tidak ditemukan."
            }
          };
        }
        const currentOperationText = isVideoOperation ? "Video" : isImageRestoreOperation ? "Restorasi Gambar" : isImageColorizeOperation ? "Pewarnaan Gambar" : isImageDenoiseOperation ? "Denoise Gambar" : "Job";
        console.log(`[INFO] ${currentOperationText} masih diproses... Menunggu 5 detik sebelum cek ulang.`);
        await new Promise(resolve => setTimeout(resolve, 5e3));
      } catch (error) {
        console.warn(`[WARNING] Gagal mengambil status job: ${error.message}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
    }
    const timeoutOperationText = isVideoOperation ? "video" : isImageRestoreOperation ? "restorasi gambar" : isImageColorizeOperation ? "pewarnaan gambar" : isImageDenoiseOperation ? "denoise gambar" : "gambar";
    console.error(`[ERROR] Timeout: Server tidak merespons dalam batas waktu yang ditentukan untuk ${timeoutOperationText}.`);
    return {
      status: false,
      code: 400,
      result: {
        error: `Timeout: Server tidak merespons untuk ${timeoutOperationText}.`
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
    const data = await unblurAI.processMedia(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}