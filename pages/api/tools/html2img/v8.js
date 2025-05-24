import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  v4 as uuidv4
} from "uuid";
class WordizeConverter {
  constructor() {
    this.baseURL = "https://api.wordize.app/conversion/api";
    this.sessionId = uuidv4();
  }
  async convertFile({
    html,
    output,
    lang,
    ocr,
    pass
  }) {
    try {
      const fileName = `${uuidv4()}.html`;
      const buffer = Buffer.from(html, "utf-8");
      const formData = new FormData();
      formData.append("1", new Blob([buffer], {
        type: "text/html"
      }), fileName);
      const conversionOptions = {
        UseOcr: ocr || "false",
        Locale: lang || "en",
        Password: pass || null,
        OutputType: output || "PNG",
        sessionId: this.sessionId,
        fileIds: [null],
        rotationAngles: [0]
      };
      formData.append("model", JSON.stringify(conversionOptions));
      formData.append("ConversionOptions", JSON.stringify(conversionOptions));
      const headers = {
        accept: "*/*",
        "content-type": `multipart/form-data; boundary=${formData.boundary}`,
        origin: "https://www.wordize.app",
        referer: "https://www.wordize.app/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      };
      const {
        data
      } = await axios.post(`${this.baseURL}/convert?outputType=${output}`, formData, {
        headers: headers
      });
      if (!data.id) throw new Error("Gagal mengonversi file.");
      return data.id;
    } catch (error) {
      console.error("Error saat konversi:", error.message);
      return null;
    }
  }
  async convertHTMLToImage({
    html,
    output = "PNG",
    lang = "en",
    ocr = "false",
    pass = null
  }) {
    try {
      const pngId = await this.convertFile({
        html: html,
        output: output,
        lang: lang,
        ocr: ocr,
        pass: pass
      });
      if (!pngId) return null;
      return `${this.baseURL}/download?id=${pngId}`;
    } catch (error) {
      console.error("Gagal menjalankan proses:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new WordizeConverter();
    const result = await converter.convertHTMLToImage(params);
    return res.status(200).json({
      url: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}