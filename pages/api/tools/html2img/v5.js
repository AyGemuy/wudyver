import axios from "axios";
class Pictify {
  constructor() {
    this.baseUrl = "https://api.pictify.io";
    this.url = `${this.baseUrl}/image/public`;
    this.client = axios.create({
      withCredentials: true
    });
  }
  async getCookies() {
    try {
      const {
        headers
      } = await this.client.get("https://pictify.io", {
        headers: {
          "user-agent": "Mozilla/5.0"
        }
      });
      return headers["set-cookie"]?.join("; ") || "";
    } catch {
      return "";
    }
  }
  async convertHTMLToImage({
    html,
    width = 1280,
    height = 1280,
    ext = "png",
    ...params
  } = {}) {
    try {
      const cookie = await this.getCookies();
      const headers = {
        accept: "*/*",
        "content-type": "application/json",
        cookie: cookie,
        origin: "https://pictify.io",
        referer: "https://pictify.io/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      };
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
    } catch {
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