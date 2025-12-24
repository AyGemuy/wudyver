import axios from "axios";
import {
  randomUUID
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class NanoBananaAI {
  constructor(options = {}) {
    this.enableLogging = options.log ?? true;
    this.baseURL = "https://nano-banana-ai.org/api";
    this.publicConfig = {
      siteUrl: "https://nano-banana-ai-n6ykycrgh-frontend-afeis-projects.vercel.app",
      resourceUrl: "https://files.nano-banana-ai.org",
      s3BucketName: "nano-banana-ai"
    };
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://nano-banana-ai.org",
        priority: "u=1, i",
        referer: "https://nano-banana-ai.org/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  log(message) {
    this.enableLogging ? console.log(`[NanoBananaAI LOG] ${message}`) : null;
  }
  generateUUID() {
    return randomUUID();
  }
  formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Number.parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  }
  validateFile(file, maxSize = 10 * 1024 * 1024) {
    if (!file.type.startsWith("image/")) {
      throw new Error("File Format Error: Please upload image files");
    }
    if (file.size > maxSize) {
      throw new Error(`File Too Large: File size cannot exceed ${this.formatFileSize(maxSize)}`);
    }
    return true;
  }
  async _handleImageUrl(imageUrl) {
    if (!imageUrl) {
      throw new Error("imageUrl diperlukan untuk Image-to-Image generation");
    }
    this.log(`Memproses input gambar: ${imageUrl}`);
    if (imageUrl.startsWith("data:image/")) {
      this.log("Input adalah string Base64.");
      return imageUrl;
    }
    if (imageUrl.startsWith("http")) {
      this.log(`Input adalah URL. Mengunduh dari: ${imageUrl}`);
      try {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
          }
        });
        const fileInfo = {
          type: response.headers["content-type"],
          size: parseInt(response.headers["content-length"] || response.data.length)
        };
        this.validateFile(fileInfo);
        const mimeType = response.headers["content-type"];
        const base64 = Buffer.from(response.data).toString("base64");
        return `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.error("Gagal mengunduh gambar dari URL.", error.message);
        throw new Error(`Tidak dapat memproses gambar dari URL: ${imageUrl}`);
      }
    }
    throw new Error("Format imageUrl tidak valid. Harus berupa URL publik atau Base64 data URI.");
  }
  async getSignedUploadUrl(bucket, path) {
    this.log(`Mendapatkan signed URL untuk upload: ${bucket}/${path}`);
    try {
      const response = await this.api.post("/trpc/uploads.signedUploadUrl?batch=1", {
        0: {
          json: {
            bucket: bucket,
            path: path
          }
        }
      });
      const signedUrl = response.data?.[0]?.result?.data?.json;
      if (!signedUrl) {
        throw new Error("Gagal mendapatkan signed URL");
      }
      this.log(`Signed URL berhasil didapatkan`);
      return signedUrl;
    } catch (error) {
      console.error("Error mendapatkan signed URL:", error.response?.data || error.message);
      throw error;
    }
  }
  async uploadImageToSignedUrl(signedUrl, imageData, contentType = "image/jpeg") {
    this.log(`Mengupload gambar ke signed URL`);
    try {
      let imageBuffer;
      if (imageData.startsWith("data:")) {
        const base64Data = imageData.split(",")[1];
        imageBuffer = Buffer.from(base64Data, "base64");
      } else {
        imageBuffer = imageData;
      }
      const response = await axios.put(signedUrl, imageBuffer, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID",
          Connection: "keep-alive",
          "Content-Length": imageBuffer.length,
          Origin: "https://nano-banana-ai.org",
          Referer: "https://nano-banana-ai.org/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "content-type": contentType,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      const fileUrl = signedUrl.split("?")[0];
      this.log(`Upload berhasil: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      console.error("Error upload gambar:", error.response?.data || error.message);
      throw error;
    }
  }
  getFileExtension(mimeType) {
    const extensions = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp"
    };
    return extensions[mimeType] || "png";
  }
  async uploadImage(imageData, mimeType = "image/jpeg") {
    this.log(`Memulai proses upload gambar`);
    try {
      const extension = this.getFileExtension(mimeType);
      const uuid = this.generateUUID();
      const path = `original/${uuid}.${extension}`;
      const signedUrl = await this.getSignedUploadUrl(this.publicConfig.s3BucketName, path);
      const fileUrl = await this.uploadImageToSignedUrl(signedUrl, imageData, mimeType);
      const urlObj = new URL(fileUrl);
      const pathParts = urlObj.pathname.split("/");
      const publicPath = pathParts.slice(2).join("/");
      const publicUrl = `${this.publicConfig.resourceUrl}/${publicPath}`;
      this.log(`Upload selesai: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("Error dalam proses upload:", error.message);
      throw error;
    }
  }
  async img2img({
    prompt,
    imageUrl,
    outputFormat = "png",
    imageSize = "auto",
    ...rest
  }) {
    if (!prompt) throw new Error("prompt diperlukan untuk Image-to-Image generation");
    if (!imageUrl || Array.isArray(imageUrl) && imageUrl.length === 0) {
      throw new Error("imageUrl (tunggal atau dalam array) diperlukan untuk Image-to-Image generation");
    }
    this.log(`Membuat task Image-to-Image dengan prompt: "${prompt}"`);
    try {
      const urlsToProcess = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      this.log(`Akan memproses dan mengunggah ${urlsToProcess.length} gambar.`);
      const uploadedImageUrls = [];
      for (const singleImageUrl of urlsToProcess) {
        this.log("Memproses gambar...");
        const processedImage = await this._handleImageUrl(singleImageUrl);
        const mimeType = processedImage.substring(processedImage.indexOf(":") + 1, processedImage.indexOf(";"));
        this.log("Mengunggah gambar...");
        const uploadedUrl = await this.uploadImage(processedImage, mimeType);
        uploadedImageUrls.push(uploadedUrl);
        this.log(`Gambar berhasil diunggah: ${uploadedUrl}`);
      }
      const payload = {
        0: {
          json: {
            prompt: prompt,
            imageUrls: uploadedImageUrls,
            outputFormat: outputFormat,
            imageSize: imageSize,
            ...rest
          }
        }
      };
      this.log(`Mengirim permintaan Image-to-Image...`);
      const response = await this.api.post("/trpc/ai.createNanoBananaTask?batch=1", payload);
      const taskId = response.data?.[0]?.result?.data?.json?.data?.taskId;
      if (!taskId) {
        throw new Error("Gagal mendapatkan task ID");
      }
      this.log(`Task Image-to-Image berhasil dibuat: ${taskId}`);
      return {
        taskId: taskId
      };
    } catch (error) {
      console.error("Error membuat task Image-to-Image:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    task_id: taskId,
    ...rest
  }) {
    if (!taskId) throw new Error("taskId diperlukan untuk memeriksa status.");
    this.log(`Memeriksa status untuk task ID: ${taskId}`);
    try {
      const inputJson = JSON.stringify({
        0: {
          json: {
            taskId: taskId,
            ...rest
          }
        }
      });
      const encodedInput = encodeURIComponent(inputJson);
      const url = `/trpc/ai.queryNanoBananaTask?batch=1&input=${encodedInput}`;
      const response = await this.api.get(url);
      const result = response.data?.[0]?.result?.data?.json;
      if (result?.status === "SUCCESS") {
        this.log(`Task ${taskId} berhasil: ${result.data?.resultUrls?.length || 0} gambar dihasilkan`);
        return result.data?.response || {
          resultUrls: []
        };
      } else if (result?.status === "PROCESSING") {
        this.log(`Task ${taskId} masih diproses`);
        return {
          status: "processing"
        };
      } else if (result?.status === "FAILED") {
        this.log(`Task ${taskId} gagal: ${result.data?.failMsg || "Unknown error"}`);
        throw new Error(result.data?.failMsg || "Task failed");
      } else {
        this.log(`Status task ${taskId} tidak diketahui: ${result?.status}`);
        return {
          status: result?.status || "unknown"
        };
      }
    } catch (error) {
      console.error(`Error memeriksa status task ${taskId}:`, error.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const api = new NanoBananaAI();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for create."
          });
        }
        response = await api.img2img(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'create', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}