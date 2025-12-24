import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class Converter {
  constructor() {
    this.apiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/convert/v2`;
  }
  async convertHTMLToImage({
    html
  }) {
    if (!html || typeof html !== "string") {
      return {
        success: false,
        error: "HTML harus berupa string dan tidak boleh kosong"
      };
    }
    try {
      const apiResponse = await axios.post(this.apiUrl, {
        media: html,
        from: "html",
        to: "png"
      }, {
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      return apiResponse.data?.url;
    } catch (error) {
      const errMsg = error.response?.data || error.message;
      return {
        success: false,
        error: errMsg
      };
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
    const converter = new Converter();
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