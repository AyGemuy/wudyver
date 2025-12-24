import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class OCRService {
  constructor() {
    this.urlUpload = "https://ocr.convertserver.com/php/ocrupload.php";
    this.urlProcess = "https://ocr.convertserver.com/php/apiocr.php";
  }
  async uploadImage(input, options = {}) {
    try {
      const isBuffer = Buffer.isBuffer(input);
      const isBase64 = typeof input === "string" && input.startsWith("data:");
      const isUrl = typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"));
      const imageData = isBuffer ? await this.processBuffer(input, options) : isBase64 ? await this.processBase64(input) : isUrl ? await this.processUrl(input) : (() => {
        throw new Error("Unsupported input type");
      })();
      const form = new FormData();
      form.append("files", new Blob([imageData.buffer], {
        type: imageData.contentType
      }), imageData.filename);
      const {
        data
      } = await axios.post(this.urlUpload, form, {
        headers: form.headers
      });
      !data.isSuccess && (() => {
        throw new Error("Upload failed");
      })();
      return data.files[0].name;
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
  async processOCR(fileName, format = "docx", lang = ["eng", "ind"]) {
    try {
      const MathStr = parseInt(Math.random() * 1e4);
      const jsonps = "jsoncallback" + MathStr;
      const {
        data
      } = await axios.post(this.urlProcess, null, {
        params: {
          jsoncallback2211: jsonps,
          mstr: 2211,
          oldfile: fileName,
          ocrformat: format,
          lang: lang,
          _: Date.now()
        },
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          referer: "https://www.iloveocr.com/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "script",
          "sec-fetch-mode": "no-cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const callbackStart = data.indexOf(jsonps + "(");
      const callbackEnd = data.indexOf(")", callbackStart);
      const result = JSON.parse(data.slice(callbackStart + jsonps.length + 1, callbackEnd));
      !result.success && (() => {
        throw new Error("OCR processing failed");
      })();
      return result;
    } catch (error) {
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }
  async processImage(input, options = {}) {
    try {
      const fileName = await this.uploadImage(input, options);
      const result = await this.processOCR(fileName, options.format, options.lang);
      return result;
    } catch (error) {
      throw new Error(`OCR failed: ${error.message}`);
    }
  }
  async processUrl(url) {
    const {
      data: fileBuffer,
      headers
    } = await axios.get(url, {
      responseType: "arraybuffer"
    });
    const ext = headers["content-type"]?.split("/")[1] || "jpg";
    return {
      buffer: Buffer.from(fileBuffer),
      contentType: headers["content-type"] || "image/jpeg",
      filename: `file.${ext}`
    };
  }
  async processBase64(base64String) {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const contentType = base64String.startsWith("data:image/png") ? "image/png" : base64String.startsWith("data:image/gif") ? "image/gif" : base64String.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    const extension = contentType.split("/")[1];
    return {
      buffer: buffer,
      contentType: contentType,
      filename: `file.${extension}`
    };
  }
  async processBuffer(buffer, options = {}) {
    return {
      buffer: buffer,
      contentType: options.contentType || "image/jpeg",
      filename: options.filename || "file.jpg"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  !params.image && res.status(400).json({
    error: "Image is required"
  });
  try {
    const ocr = new OCRService();
    const data = await ocr.processImage(params.image, {
      format: params.format,
      lang: params.lang,
      contentType: params.contentType,
      filename: params.filename
    });
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}