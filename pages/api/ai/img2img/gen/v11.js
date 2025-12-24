import axios from "axios";
import {
  randomUUID
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class AIImageEditor {
  constructor(options = {}) {
    this.enableLogging = options.log ?? true;
    this.baseURL = "https://ai-image-editor.com/api";
    this.publicConfig = {
      siteUrl: "https://ai-image-editor.com",
      resourceUrl: "https://files.ai-image-editor.com",
      s3BucketName: "ai-image-editor"
    };
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://ai-image-editor.com",
        priority: "u=1, i",
        referer: "https://ai-image-editor.com/",
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
    this.enableLogging ? console.log(`[AIImageEditor LOG] ${message}`) : null;
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
  async uploadImageToSignedUrl(signedUrl, imageData, contentType = "image/png") {
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
          Origin: "https://ai-image-editor.com",
          Referer: "https://ai-image-editor.com/",
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
  async uploadImage(imageData, mimeType = "image/png") {
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
  async createTask({
    prompt,
    imageUrl,
    outputFormat = "png",
    imageSize = "auto",
    nVariants = 1,
    ...rest
  }) {
    if (!prompt) throw new Error("prompt diperlukan untuk membuat task");
    if (!imageUrl || !Array.isArray(imageUrl) || imageUrl.length === 0) {
      throw new Error("imageUrl (array) diperlukan untuk membuat task");
    }
    this.log(`Membuat task dengan prompt: "${prompt}"`);
    try {
      this.log(`Akan memproses dan mengunggah ${imageUrl.length} gambar.`);
      const uploadedImageUrls = [];
      for (const singleImageUrl of imageUrl) {
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
            imageUrls: uploadedImageUrls,
            prompt: prompt,
            outputFormat: outputFormat,
            imageSize: imageSize,
            nVariants: nVariants,
            ...rest
          }
        }
      };
      this.log(`Mengirim permintaan create task...`);
      const response = await this.api.post("/trpc/ai.createNanoBananaTask?batch=1", payload);
      const task_id = response.data?.[0]?.result?.data?.json?.data?.taskId;
      if (!task_id) {
        throw new Error("Gagal mendapatkan task ID");
      }
      this.log(`Task berhasil dibuat: ${task_id}`);
      return {
        task_id: task_id,
        success: true
      };
    } catch (error) {
      console.error("Error membuat task:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    task_id,
    visitorId = "",
    ...rest
  }) {
    if (!task_id) throw new Error("task_id diperlukan untuk memeriksa status.");
    this.log(`Memeriksa status untuk task ID: ${task_id}`);
    try {
      const inputJson = JSON.stringify({
        0: {
          json: {
            taskId: task_id,
            visitorId: visitorId,
            ...rest
          }
        }
      });
      const encodedInput = encodeURIComponent(inputJson);
      const url = `/trpc/ai.queryNanoBananaTask?batch=1&input=${encodedInput}`;
      const response = await this.api.get(url);
      const result = response.data?.[0]?.result?.data?.json;
      if (result?.status === "SUCCESS") {
        this.log(`Task ${task_id} berhasil: ${result.data?.resultUrls?.length || 0} gambar dihasilkan`);
        return {
          success: true,
          status: "success",
          data: result.data,
          resultUrls: result.data?.resultUrls || []
        };
      } else if (result?.status === "PROCESSING" || result?.data?.state === "processing") {
        this.log(`Task ${task_id} masih diproses`);
        return {
          success: true,
          status: "processing",
          shouldStopPolling: false
        };
      } else if (result?.status === "FAILED") {
        this.log(`Task ${task_id} gagal: ${result.data?.failMsg || "Unknown error"}`);
        return {
          success: false,
          status: "failed",
          error: result.data?.failMsg || "Task failed"
        };
      } else {
        this.log(`Status task ${task_id}: ${result?.status || result?.data?.state}`);
        return {
          success: true,
          status: result?.status || result?.data?.state || "unknown",
          data: result?.data
        };
      }
    } catch (error) {
      console.error(`Error memeriksa status task ${task_id}:`, error.response?.data || error.message);
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
  const api = new AIImageEditor();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for create."
          });
        }
        response = await api.createTask(params);
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
          error: `Invalid action: ${action}. Supported actions are 'create' and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}