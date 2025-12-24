import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class SelectPdfConverter {
  constructor() {
    this.baseURL = "https://selectpdf.com";
    this.convertURL = `${this.baseURL}/demo/convert-html-code-to-image.aspx`;
    this.viewState = "";
    this.eventValidation = "";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
  }
  async getInitialParams() {
    try {
      const response = await axios.get(this.convertURL, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      if (response.status === 200) {
        const viewStateRegex = /id="__VIEWSTATE" value="([^"]*)"/;
        const eventValidationRegex = /id="__EVENTVALIDATION" value="([^"]*)"/;
        const viewStateMatch = response.data.match(viewStateRegex);
        const eventValidationMatch = response.data.match(eventValidationRegex);
        this.viewState = viewStateMatch ? viewStateMatch[1] : "";
        this.eventValidation = eventValidationMatch ? eventValidationMatch[1] : "";
        console.log("__VIEWSTATE:", this.viewState);
        console.log("__EVENTVALIDATION:", this.eventValidation);
      } else {
        throw new Error(`Gagal mendapatkan parameter awal. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat mendapatkan parameter awal:", error);
      throw error;
    }
  }
  async convertHTMLToImage({
    html,
    baseUrl = "",
    imageFormat = "png",
    width = 1280,
    height = 1280
  }) {
    try {
      if (!this.viewState || !this.eventValidation) {
        await this.getInitialParams();
      }
      const formData = new FormData();
      formData.append("__VIEWSTATE", this.viewState);
      formData.append("__VIEWSTATEGENERATOR", "5A2067F3");
      formData.append("__EVENTVALIDATION", this.eventValidation);
      formData.append("ctl00$mainContent$TxtHtmlCode", html);
      formData.append("ctl00$mainContent$TxtBaseUrl", baseUrl);
      formData.append("ctl00$mainContent$DdlImageFormat", imageFormat);
      formData.append("ctl00$mainContent$TxtWidth", width.toString());
      formData.append("ctl00$mainContent$TxtHeight", height.toString());
      formData.append("ctl00$mainContent$BtnSubmit", "Convert To Image");
      const headers = {
        accept: "image/png,image/jpeg,image/gif,image/*,*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://selectpdf.com",
        pragma: "no-cache",
        priority: "u=0, i",
        referer: "https://selectpdf.com/demo/convert-html-code-to-image.aspx",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      };
      const response = await axios.post(this.convertURL, formData, {
        headers: headers,
        responseType: "arraybuffer",
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 300
      });
      if (response.status === 200) {
        return Buffer.from(response.data, "binary");
      } else {
        throw new Error(`Konversi gagal. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Terjadi kesalahan selama konversi:", error);
      if (error.response && error.response.status !== 200) {
        console.log("Mencoba mengambil parameter baru dan mengulang konversi...");
        await this.getInitialParams();
        return this.convertHTMLToImage({
          html: html,
          baseUrl: baseUrl,
          imageFormat: imageFormat,
          width: width,
          height: height
        });
      }
      throw error;
    }
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async convertAndUpload({
    html,
    baseUrl = "",
    imageFormat = "png",
    width = 1280,
    height = 1280
  }) {
    try {
      const imageBuffer = await this.convertHTMLToImage({
        html: html,
        baseUrl: baseUrl,
        imageFormat: imageFormat,
        width: width,
        height: height
      });
      const imageUrl = await this.uploadImage(imageBuffer);
      return imageUrl;
    } catch (error) {
      console.error("Terjadi kesalahan selama konversi dan unggah:", error);
      throw error;
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
    const converter = new SelectPdfConverter();
    const result = await converter.convertAndUpload(params);
    return res.status(200).json({
      url: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}