import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class OCR {
  constructor(apiKey = "4qlkYrXJ4Z255nLU35mnq84sr1VmMs9j1su18xlK") {
    this.apiKey = apiKey;
    this.baseURL = "https://nmwe4beyw1.execute-api.us-east-1.amazonaws.com/dev/recognize/";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://www.pen-to-print.com",
      pragma: "no-cache",
      referer: "https://www.pen-to-print.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-api-key": this.apiKey
    };
  }
  log(step, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [OCR_PROCESS] [${step}] ${message}`);
  }
  generateSession() {
    return crypto.randomUUID();
  }
  async generateHash(buffer) {
    try {
      this.log("HASHING", "Memulai pembuatan hash dari buffer...");
      const hashHex = crypto.createHash("sha256").update(buffer).digest("hex");
      let srcHash = "";
      for (let i = 0; i < 10; i++) {
        srcHash += hashHex[3 + 3 * i];
      }
      this.log("HASHING", `Hash berhasil dibuat: ${srcHash}`);
      return srcHash;
    } catch (error) {
      this.log("HASHING_ERROR", error.message);
      throw error;
    }
  }
  async processImage(input, options = {}) {
    try {
      let imageData;
      if (Buffer.isBuffer(input)) {
        this.log("INPUT", "Menerima input berupa Buffer.");
        imageData = {
          buffer: input,
          contentType: options.contentType || "image/jpeg",
          filename: options.filename || "image.jpg"
        };
      } else if (typeof input === "string" && input.startsWith("data:")) {
        this.log("INPUT", "Menerima input berupa Base64.");
        imageData = await this.processBase64(input);
      } else if (typeof input === "string" && input.startsWith("http")) {
        this.log("INPUT", `Menerima input berupa URL: ${input}`);
        imageData = await this.processUrl(input);
      } else {
        throw new Error("Tipe input tidak dikenal (Harus Buffer, Base64, atau URL).");
      }
      const session = this.generateSession();
      const srcHash = await this.generateHash(imageData.buffer);
      this.log("SESSION", `Generated Session ID: ${session}`);
      this.log("FORM_DATA", "Menyusun payload multipart/form-data...");
      const form = new FormData();
      form.append("srcImg", imageData.buffer, {
        filename: imageData.filename,
        contentType: imageData.contentType
      });
      form.append("srcHash", srcHash);
      form.append("includeSubScan", "1");
      form.append("userId", "undefined");
      form.append("session", session);
      form.append("appVersion", "1.0");
      let response;
      let maxRetries = 30;
      let retryCount = 0;
      this.log("API_REQUEST", `Mengirim data ke server (Max retry: ${maxRetries})...`);
      while (retryCount < maxRetries) {
        try {
          response = await axios.post(this.baseURL, form, {
            headers: {
              ...this.headers,
              ...form.getHeaders()
            },
            timeout: 3e4
          });
          const data = response.data;
          if (data.result === "1") {
            this.log("SUCCESS", "OCR Berhasil diproses!");
            return data;
          }
          this.log("WAITING", `Status: ${data.status || "Processing"}... (Tunggu 2 detik | Percobaan: ${retryCount + 1}/${maxRetries})`);
        } catch (apiErr) {
          this.log("API_ERROR", `Koneksi gagal pada percobaan ${retryCount + 1}: ${apiErr.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2e3));
        retryCount++;
      }
      throw new Error("Timeout: Server tidak mengembalikan hasil dalam waktu yang ditentukan.");
    } catch (error) {
      this.log("FATAL_ERROR", error.message);
      throw error;
    }
  }
  async processUrl(url) {
    try {
      this.log("FETCH_URL", `Mendownload gambar...`);
      const {
        data,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/jpeg";
      this.log("FETCH_URL", `Download selesai. Type: ${contentType}`);
      return {
        buffer: Buffer.from(data),
        contentType: contentType,
        filename: "downloaded_image.jpg"
      };
    } catch (error) {
      throw new Error(`Gagal mengambil gambar dari URL: ${error.message}`);
    }
  }
  async processBase64(base64String) {
    try {
      this.log("DECODE_BASE64", "Mengonversi base64 ke buffer...");
      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) throw new Error("Format base64 tidak valid.");
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      this.log("DECODE_BASE64", `Berhasil. Type: ${contentType}, Size: ${buffer.length} bytes`);
      return {
        buffer: buffer,
        contentType: contentType,
        filename: `file.${contentType.split("/")[1]}`
      };
    } catch (error) {
      throw new Error(`Gagal memproses Base64: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const ocr = new OCR();
  const startTime = Date.now();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.image) {
      return res.status(400).json({
        error: "Field 'image' (URL/Base64) diperlukan."
      });
    }
    console.log("--- START OCR JOB ---");
    const result = await ocr.processImage(params.image, {
      contentType: params.contentType,
      filename: params.filename
    });
    const duration = (Date.now() - startTime) / 1e3;
    console.log(`--- END OCR JOB (Total: ${duration}s) ---`);
    return res.status(200).json({
      success: true,
      duration: `${duration}s`,
      ...result
    });
  } catch (error) {
    console.error("[HANDLER_ERROR]", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}