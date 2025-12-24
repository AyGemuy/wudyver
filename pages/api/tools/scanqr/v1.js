import axios from "axios";
import {
  FormData
} from "formdata-node";
import {
  randomUUID
} from "crypto";
import * as cheerio from "cheerio";
class BarcodeRecognizer {
  constructor() {
    this.uuid = randomUUID();
  }
  async imageUrlToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return `data:${response.headers["content-type"]};base64,${Buffer.from(response.data).toString("base64")}`;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
  async recognizeBarcode(imageUrl) {
    try {
      const fileBase64 = await this.imageUrlToBase64(imageUrl);
      if (!fileBase64 || fileBase64.error) return fileBase64;
      const formData = new FormData();
      formData.append("type", "qr");
      formData.append("quality", "2");
      formData.append("fileBase64", fileBase64);
      formData.append("uuid", this.uuid);
      const response = await axios.post("https://api.products.aspose.app/barcode/recognize/apiRequestRecognize?culture=en", formData, {
        headers: {
          ...formData.headers,
          cookie: `uuid=${this.uuid}`
        }
      });
      const recognizeResultToken = response.data?.recognizeResultToken;
      if (!recognizeResultToken) return {
        error: "No recognizeResultToken"
      };
      let result;
      let ready = false;
      while (!ready) {
        const timestamp = Date.now();
        const pollingResponse = await axios.get(`https://api.products.aspose.app/barcode/recognize/recognizeresult/${recognizeResultToken}?timestamp=${timestamp}`, {
          headers: {
            cookie: `uuid=${this.uuid}`
          }
        });
        result = pollingResponse.data;
        ready = result?.ready || false;
        if (!ready) await new Promise(resolve => setTimeout(resolve, 2e3));
      }
      const $ = cheerio.load(result.html || "");
      const barcodeTexts = [];
      $("textarea").each((index, element) => {
        barcodeTexts.push($(element).text());
      });
      return barcodeTexts;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "Missing URL parameter"
      });
    }
    const barcodeRecognizer = new BarcodeRecognizer();
    const result = await barcodeRecognizer.recognizeBarcode(url);
    if (result.error) {
      return res.status(500).json({
        error: result.error
      });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}