import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import qs from "qs";
class CheckupTools {
  constructor() {
    this.baseURL = "https://checkup.tools";
    this.path = "/en/website-screenshot-generator";
    this.outputURL = "/en/website-screenshot-generator/output";
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
    output = "buffer"
  } = {}) {
    const targetUrl = url || "https://google.com";
    console.log("[CheckupTools] Generating screenshot for:", targetUrl);
    try {
      await this.client.get(this.path, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const postData = qs.stringify({
        url: targetUrl,
        submit: "Submit"
      });
      const response = await this.client.post(this.outputURL, postData, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "id-ID",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseURL,
          referer: this.baseURL + this.path,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const ajaxImgSrc = $("img.imgSrc").attr("src");
      if (!ajaxImgSrc) {
        throw new Error("Screenshot image source not found in HTML response");
      }
      const downloadUrl = ajaxImgSrc.startsWith("http") && ajaxImgSrc || `${this.baseURL}${ajaxImgSrc.startsWith("/") ? "" : "/"}${ajaxImgSrc}`;
      console.log("[CheckupTools] Final Image URL:", downloadUrl);
      const resImage = await this.client.get(downloadUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(resImage?.data || "");
      const mime = resImage?.headers["content-type"] || "image/png";
      const finalResult = output === "base64" && buffer.toString("base64") || output === "url" && downloadUrl || buffer;
      return {
        success: true,
        data: finalResult,
        mime: mime,
        url: downloadUrl
      };
    } catch (error) {
      console.error("[CheckupTools Error]", error.message);
      return {
        success: false,
        error: error.message || "Failed to generate screenshot",
        data: null
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
  const api = new CheckupTools();
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