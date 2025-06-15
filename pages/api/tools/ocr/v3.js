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
  async ocr({
    url,
    ...payload
  }) {
    try {
      const {
        contentType,
        ext
      } = await this.getFileInfo(url);
      const {
        data: fileBuffer
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const form = new FormData();
      form.append("userfile", new Blob([fileBuffer], {
        type: contentType
      }), `file.${ext}`);
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
      Object.assign(ocrPayload, payload, {
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
  async getFileInfo(url) {
    try {
      const {
        headers
      } = await axios.head(url);
      return {
        contentType: headers["content-type"],
        ext: headers["content-type"].split("/")[1]
      };
    } catch (error) {
      throw new Error(`Failed to fetch file info: ${error.message}`);
    }
  }
  async extractOCRPayload(html) {
    try {
      const $ = cheerio.load(html);
      const payload = {};
      $("#form-ocr input, #form-ocr select").each((_, el) => {
        const name = $(el).attr("name");
        if (name) payload[name] = $(el).val() || "";
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
  const {
    url,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const ocr = new NewOCR();
  try {
    const data = await ocr.ocr({
      url: url,
      ...params
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