import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TeraboxFastDownloader {
  constructor() {
    this.baseUrl = "https://web.teraboxfast.workers.dev/";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://www.teraboxfast.com",
      referer: "https://www.teraboxfast.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site"
    };
  }
  extractId(url) {
    const match = url.match(/(?:s\/|surl=|folder\/|file\/|share\/)([\w-]+)/i);
    return match ? match[1] : null;
  }
  async fetchDownloadLink(teraboxUrl) {
    try {
      const response = await this.client.get(`${this.baseUrl}?url=${encodeURIComponent(teraboxUrl)}`, {
        headers: this.headers
      });
      const {
        data
      } = response;
      if (!data) throw new Error("Gagal mendapatkan link download.");
      const videoId = this.extractId(teraboxUrl);
      const m3u8Link = videoId ? `https://core.mdiskplay.com/box/terabox/video/${videoId}.m3u8` : null;
      return {
        ...data,
        m3u8: m3u8Link
      };
    } catch (error) {
      throw new Error(`Gagal mendapatkan link: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Parameter `url` wajib disertakan"
    });
  }
  const terabox = new TeraboxFastDownloader();
  try {
    const result = await terabox.fetchDownloadLink(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error during processing:", error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}