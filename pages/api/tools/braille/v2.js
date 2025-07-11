import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";
class OpenLTranslate {
  constructor() {
    this.apiSecret = "6VRWYJLMAPAR9KX2UJ";
    this.secret = "IEODE9aBhM";
    this.signature = this.generateSignature();
  }
  generateSignature() {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString();
    const signature = crypto.createHash("md5").update(["TGDBU9zCgM", timestamp, nonce].sort().join("")).digest("hex");
    return {
      "X-API-Secret": this.apiSecret,
      signature: signature,
      timestamp: timestamp,
      nonce: nonce,
      secret: this.secret
    };
  }
  async imageToBraille({
    url
  }) {
    try {
      const {
        data: fileBuffer,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const ext = headers["content-type"].split("/")[1];
      const formData = new FormData();
      formData.append("file", new Blob([fileBuffer], {
        type: `image/${ext}`
      }), `file.${ext}`);
      const response = await axios.post("https://api.openl.io/translate/img", formData, {
        headers: {
          ...this.signature,
          accept: "application/json",
          "content-type": "multipart/form-data",
          origin: "https://openl.io",
          referer: "https://openl.io/",
          "user-agent": "Mozilla/5.0"
        }
      });
      return await this.textToBraille({
        text: response.data
      });
    } catch (error) {
      console.error("Error in imageToBraille:", error);
      throw error;
    }
  }
  async textToBraille({
    text
  }) {
    try {
      const response = await axios.post("https://api.openl.io/translate/v1", {
        prompt: {
          type: 1,
          targetLang: "Braille",
          text: text,
          industry: "professional",
          translateType: "text"
        }
      }, {
        headers: {
          ...this.signature,
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://openl.io",
          referer: "https://openl.io/",
          "user-agent": "Mozilla/5.0"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error in textToBraille:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const openL = new OpenLTranslate();
  try {
    let result;
    switch (action) {
      case "text":
        if (!params.text) throw new Error("Text is required.");
        result = await openL.textToBraille(params);
        break;
      case "image":
        if (!params.url) throw new Error("Image URL is required.");
        result = await openL.imageToBraille(params);
        break;
      default:
        throw new Error("Invalid action.");
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
}