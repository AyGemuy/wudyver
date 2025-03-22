import axios from "axios";
import {
  FormData
} from "formdata-node";
class OCRService {
  constructor() {
    this.apiUrl = "https://demo.api4ai.cloud/ocr/v1/results";
  }
  async ocr({
    url
  }) {
    try {
      const formData = new FormData();
      formData.append("url", url);
      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error while processing OCR request:", error);
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