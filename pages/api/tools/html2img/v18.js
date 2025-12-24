import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class UibunConverter {
  constructor() {
    this.apiUrl = "https://img-gen.uibun.dev/api/htmltoimg";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
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
      const uibunResponse = await axios.post(this.apiUrl, {
        html: html
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://www.uibun.dev",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.uibun.dev/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        },
        responseType: "arraybuffer"
      });
      const imageBuffer = uibunResponse.data;
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: "image.png",
        contentType: "image/png"
      });
      const uploadResponse = await axios.post(this.uploadUrl, form, {
        headers: form.getHeaders()
      });
      const uploadedUrl = uploadResponse.result;
      return uploadedUrl;
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
    const converter = new UibunConverter();
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