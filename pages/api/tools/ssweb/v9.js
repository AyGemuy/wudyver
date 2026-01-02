import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class PxlAPI {
  constructor() {
    this.baseURL = "https://app.pxl.to";
    this.apiURL = "/api/public/tools/screenshot";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true,
      timeout: 6e4
    }));
  }
  async generate({
    url,
    size = "23desktop",
    width = 1920,
    height = 1080,
    full = true,
    output = "buffer"
  } = {}) {
    const targetUrl = url || "https://google.com";
    console.log("[PXL.to] Requesting screenshot for:", targetUrl);
    try {
      const response = await this.client.post(this.apiURL, {
        destination: targetUrl,
        size: size,
        width: width,
        height: height,
        full: full
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": "application/json",
          origin: "https://www.pxl.to",
          referer: "https://www.pxl.to/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const base64Raw = response.data?.data || "";
      if (!base64Raw) throw new Error("No image data received from PXL.to");
      const cleanBase64 = base64Raw.includes(",") ? base64Raw.split(",")[1] : base64Raw;
      const buffer = Buffer.from(cleanBase64, "base64");
      const mime = "image/png";
      const finalResult = output === "base64" && cleanBase64 || output === "url" && `data:${mime};base64,${cleanBase64}` || buffer;
      return {
        success: true,
        data: finalResult,
        mime: mime
      };
    } catch (error) {
      console.error("[PXL Error]", error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Failed to generate screenshot",
        status: error.response?.status
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new PxlAPI();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}