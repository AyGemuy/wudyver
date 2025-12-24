import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class NyckelChecker {
  constructor() {
    this.base = "https://www.nyckel.com";
    this.invokeEndpoint = "/v1/functions";
    this.identifierPath = "/pretrained-classifiers/nsfw-identifier";
    this.headers = {
      authority: "www.nyckel.com",
      origin: "https://www.nyckel.com",
      referer: "https://www.nyckel.com/pretrained-classifiers/nsfw-identifier/",
      "user-agent": "Postify/1.0.0",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async validateImage(url) {
    if (!url || !url.startsWith("http")) {
      return {
        valid: false,
        error: "Input harus berupa URL gambar yang valid."
      };
    }
    try {
      const head = await axios.head(url);
      const contentType = head.headers["content-type"];
      if (!contentType || !contentType.startsWith("image/")) {
        return {
          valid: false,
          error: "URL tersebut bukan gambar."
        };
      }
      return {
        valid: true,
        contentType: contentType
      };
    } catch {
      return {
        valid: false,
        error: "Gagal mengakses URL gambar."
      };
    }
  }
  async getFunctionId() {
    try {
      const res = await axios.get(this.base + this.identifierPath, {
        headers: this.headers
      });
      const $ = cheerio.load(res.data);
      const script = $('script[src*="embed-image.js"]').attr("src");
      const fid = script?.match(/[?&]id=([^&]+)/)?.[1];
      if (!fid) throw new Error("Function ID tidak ditemukan.");
      return {
        success: true,
        id: fid
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async checkImage(url) {
    const validation = await this.validateImage(url);
    if (!validation.valid) {
      return {
        success: false,
        code: 400,
        result: {
          error: validation.error
        }
      };
    }
    const functionData = await this.getFunctionId();
    if (!functionData.success) {
      return {
        success: false,
        code: 400,
        result: {
          error: functionData.error
        }
      };
    }
    try {
      const imageRes = await axios.get(url, {
        responseType: "arraybuffer",
        headers: this.headers
      });
      const blob = new Blob([imageRes.data], {
        type: validation.contentType
      });
      const form = new FormData();
      const ext = validation.contentType.split("/")[1];
      form.append("file", blob, "image." + ext);
      const invokeUrl = `${this.base}${this.invokeEndpoint}/${functionData.id}/invoke`;
      const response = await axios.post(invokeUrl, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      let {
        labelName,
        labelId,
        confidence
      } = response.data;
      if (confidence > .97) {
        const cap = Math.random() * (.992 - .97) + .97;
        confidence = Math.min(confidence, cap);
      }
      return {
        success: true,
        code: 200,
        result: {
          isNsfw: labelName.toLowerCase().includes("nsfw"),
          labelName: labelName,
          labelId: labelId,
          confidence: confidence,
          percentage: (confidence * 100).toFixed(2) + "%",
          message: labelName.toLowerCase().includes("nsfw") ? "Waduh, gambar ini terdeteksi NSFW. Jangan dishare yak bree." : "Aman bree, gambar ini tidak terdeteksi NSFW. Gaskeun!"
        }
      };
    } catch (err) {
      return {
        success: false,
        code: 400,
        result: {
          error: err.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const check = new NyckelChecker();
    const result = await check.checkImage(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}