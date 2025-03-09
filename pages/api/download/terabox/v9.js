import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TeraboxM3U8Parser {
  constructor() {
    this.apiUrl = "https://teraboxdownloaderonline.com/api/download-m3u8";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      Referer: "https://teraboxdownloaderonline.com/player",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`
    };
  }
  async fetchM3U8(teraboxUrl) {
    try {
      const {
        data
      } = await this.client.get(`${this.apiUrl}?terabox_link=${encodeURIComponent(teraboxUrl)}`, {
        headers: this.headers
      });
      if (!data.includes("EXTM3U")) throw new Error("Respon bukan file M3U8.");
      return this.parseM3U8(data);
    } catch (error) {
      throw new Error(`Gagal mengambil data M3U8: ${error.message}`);
    }
  }
  parseM3U8(m3u8Content) {
    return m3u8Content.split("\n").reduce((segments, line, i, arr) => {
      if (line.includes("EXTINF")) {
        const duration = parseFloat(line.split(":")[1].replace(",", "").trim());
        const url = arr[i + 1]?.trim();
        if (url?.startsWith("http")) segments.push({
          duration: duration,
          url: url
        });
      }
      return segments;
    }, []);
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
  const terabox = new TeraboxM3U8Parser();
  try {
    const result = await terabox.fetchM3U8(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}