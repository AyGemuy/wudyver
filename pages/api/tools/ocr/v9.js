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
  }
  generateSignature() {
    const e = new Date().getTime().toString();
    const a = Math.random().toString();
    const t = ["TGDBU9zCgM", e, a].sort().join("");
    const signature = crypto.createHash("md5").update(t).digest("hex");
    return {
      "X-API-Secret": this.apiSecret,
      signature: signature,
      timestamp: e,
      nonce: a,
      secret: this.secret
    };
  }
  async ocr({
    url: imgUrl
  }) {
    try {
      const {
        data: fileBuffer,
        headers
      } = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      const ext = headers["content-type"].split("/")[1];
      const formData = new FormData();
      formData.append("file", new Blob([fileBuffer], {
        type: `image/${ext}`
      }), `file.${ext}`);
      const signatureData = this.generateSignature();
      const response = await axios.post("https://api.openl.io/translate/img", formData, {
        headers: {
          ...signatureData,
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "multipart/form-data",
          origin: "https://openl.io",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://openl.io/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      return {
        result: response.data
      };
    } catch (error) {
      console.error("Error during image translation:", error);
      throw error;
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
  const ocr = new OpenLTranslate();
  try {
    const data = await ocr.ocr(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}