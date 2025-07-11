import axios from "axios";
import crypto from "crypto";
class Pictify {
  constructor() {
    this.baseUrl = "https://api.pictify.io";
    this.url = `${this.baseUrl}/image/public`;
    this.client = axios.create({
      withCredentials: true
    });
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.client.interceptors.response.use(this.updateCookie);
  }
  updateCookie(response) {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader) {
      const cookieString = setCookieHeader.join("; ");
      console.log("Set-Cookie:", cookieString);
    }
    return response;
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": this.defaultHeaders["user-agent"],
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.randomID(8),
      ...this.defaultHeaders,
      ...extra
    };
  }
  async convertHTMLToImage({
    html,
    width = 1280,
    height = 1280,
    ext = "png",
    ...params
  } = {}) {
    try {
      const headers = this.buildHeaders();
      const data = {
        html: html,
        width: width,
        height: height,
        ...params
      };
      if (ext !== "gif") data.fileExtension = ext;
      const response = await this.client.post(this.url, data, {
        headers: headers
      });
      return ext === "gif" ? response.data?.gif?.url : response.data?.image?.url;
    } catch (error) {
      return {
        error: "Gagal mengonversi HTML ke gambar"
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
    const converter = new Pictify();
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