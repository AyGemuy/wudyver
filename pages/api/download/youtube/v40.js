import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class CliptoDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://www.clipto.com/api",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        Origin: "https://www.clipto.com",
        Referer: "https://www.clipto.com/id/media-downloader/youtube-downloader",
        Priority: "u=1, i"
      },
      jar: this.jar,
      withCredentials: true
    }));
  }
  async getCookies() {
    try {
      await this.client.get("https://www.clipto.com");
      console.log("Cookies disimpan:", this.jar.toJSON());
    } catch (error) {
      console.error("Gagal mengambil cookie:", error.message);
    }
  }
  async getVideoData(url) {
    await this.getCookies();
    try {
      const payload = {
        url: url
      };
      const {
        data
      } = await this.client.post("/youtube", payload);
      return data;
    } catch (error) {
      console.error("Gagal mengambil data video:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const clipto = new CliptoDownloader();
    const result = await clipto.getVideoData(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}