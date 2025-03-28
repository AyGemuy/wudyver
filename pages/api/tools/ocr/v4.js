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
  async uploadImage(url) {
    try {
      const {
        data: fileBuffer,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const ext = headers["content-type"].split("/")[1];
      const form = new FormData();
      form.append("files", new Blob([fileBuffer], {
        type: headers["content-type"]
      }), `file.${ext}`);
      const {
        data
      } = await axios.post(this.urlUpload, form, {
        headers: form.headers
      });
      if (!data.isSuccess) throw new Error("Upload failed");
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
      if (!result.success) throw new Error("OCR processing failed");
      return result;
    } catch (error) {
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }
  async ocr({
    url,
    format = "docx",
    lang = ["eng", "ind"]
  }) {
    try {
      const fileName = await this.uploadImage(url);
      const result = await this.processOCR(fileName, format, lang);
      return result;
    } catch (error) {
      throw new Error(`OCR failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const ocr = new OCRService();
  try {
    const data = await ocr.ocr(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}