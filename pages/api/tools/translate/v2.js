import axios from "axios";
import crypto from "crypto";
class TranslationService {
  constructor() {
    this.apiUrl = "https://api.openl.io/translate/v1";
    this.secret = "IEODE9aBhM";
    this.xApiSecret = "6VRWYJLMAPAR9KX2UJ";
    this.headersBase = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://openl.io",
      pragma: "no-cache",
      referer: "https://openl.io/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(timestamp, nonce) {
    const data = `${timestamp}${this.secret}${nonce}`;
    return crypto.createHash("md5").update(data).digest("hex");
  }
  async translate({
    text,
    to: targetLang = "English"
  }) {
    try {
      const timestamp = Date.now().toString();
      const nonce = Math.random().toString();
      const signature = this._sign(timestamp, nonce);
      const payload = {
        prompt: {
          type: 1,
          tone: "",
          writer: "",
          targetLang: targetLang,
          text: text,
          industry: "general",
          format: null,
          summarizeType: "paragraph",
          url: "",
          translateType: "text",
          speechType: "plaintext"
        }
      };
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          ...this.headersBase,
          nonce: nonce,
          secret: this.secret,
          signature: signature,
          timestamp: timestamp,
          "x-api-secret": this.xApiSecret,
          "x-chunk-index": "first"
        }
      });
      return {
        original: text,
        translation: response.data?.data || response.data,
        source: "OpenL.io"
      };
    } catch (error) {
      console.error("OpenL Translation Error:", error.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new TranslationService();
  try {
    const data = await api.translate(params);
    if (!data) throw new Error("Gagal mendapatkan respon dari API");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal"
    });
  }
}