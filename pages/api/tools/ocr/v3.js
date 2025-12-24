import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import * as cheerio from "cheerio";
class NewOCR {
  constructor() {
    this.url = "https://www.newocr.com/";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9",
      Referer: "https://www.newocr.com/"
    };
  }
  async processImage(input, options = {}) {
    try {
      const isBuffer = Buffer.isBuffer(input);
      const isBase64 = typeof input === "string" && input.startsWith("data:");
      const isUrl = typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"));
      const imageData = isBuffer ? await this.processBuffer(input, options) : isBase64 ? await this.processBase64(input) : isUrl ? await this.processUrl(input) : (() => {
        throw new Error("Unsupported input type");
      })();
      const form = new FormData();
      form.append("userfile", new Blob([imageData.buffer], {
        type: imageData.contentType
      }), imageData.filename);
      form.append("preview", "1");
      const {
        data: uploadHTML
      } = await axios.post(this.url, form, {
        headers: {
          ...this.headers,
          ...form.headers
        }
      });
      const ocrPayload = await this.extractOCRPayload(uploadHTML);
      Object.assign(ocrPayload, options, {
        ocr: "1"
      });
      const ocrForm = new FormData();
      Object.entries(ocrPayload).forEach(([key, value]) => ocrForm.append(key, value));
      const {
        data: resultHTML
      } = await axios.post(this.url, ocrForm, {
        headers: {
          ...this.headers,
          ...ocrForm.headers
        }
      });
      return this.extractOCRText(resultHTML);
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
  async extractOCRPayload(html) {
    try {
      const $ = cheerio.load(html);
      const payload = {};
      $("#form-ocr input, #form-ocr select").each((_, el) => {
        const name = $(el).attr("name");
        name && (payload[name] = $(el).val() || "");
      });
      return payload;
    } catch (error) {
      throw new Error(`Failed to extract OCR payload: ${error.message}`);
    }
  }
  async extractOCRText(html) {
    try {
      const $ = cheerio.load(html);
      return $("#ocr-result").text().trim();
    } catch (error) {
      throw new Error(`Failed to extract OCR result: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  !params.image && res.status(400).json({
    error: "Image is required"
  });
  try {
    const ocr = new NewOCR();
    const data = await ocr.processImage(params.image, {
      ...params,
      contentType: params.contentType,
      filename: params.filename
    });
    return res.status(200).json({
      text: data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}