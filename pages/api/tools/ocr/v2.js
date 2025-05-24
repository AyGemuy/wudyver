import axios from "axios";
class OCRService {
  constructor() {
    this.apiUrl = "https://ocr-extract-text.p.rapidapi.com/ocr";
    this.apiKey = "8daf878b9fmsh814409db082a5eep1e3fbfjsnd759a2fc4af4";
    this.apiHost = "ocr-extract-text.p.rapidapi.com";
  }
  async ocr(params) {
    const {
      url
    } = params;
    const apiUrl = `${this.apiUrl}?url=${encodeURIComponent(url)}`;
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": this.apiHost
        }
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch OCR data: " + error.message);
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