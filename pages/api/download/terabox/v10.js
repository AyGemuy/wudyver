import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class MdiskFetcher {
  constructor() {
    this.baseUrl = "https://mdisksetup.shraj.workers.dev/m3u8";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://www.terabox.tech",
      priority: "u=1, i",
      referer: "https://www.terabox.tech/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  extractId(url) {
    const match = url.match(/(?:s\/|surl=|folder\/|file\/|share\/)([\w-]+)/i);
    return match ? match[1] : null;
  }
  async fetchM3U8(url) {
    const id = this.extractId(url);
    if (!id) {
      console.error("ID tidak ditemukan dalam URL.");
      return null;
    }
    try {
      const response = await this.client.get(this.baseUrl, {
        params: {
          id: id
        },
        headers: this.headers
      });
      return this.parseM3U8(response.data);
    } catch (error) {
      console.error("Error fetching M3U8:", error.message);
      return null;
    }
  }
  parseM3U8(data) {
    const lines = data.split("\n");
    const segments = [];
    let currentDuration = null;
    for (const line of lines) {
      if (line.includes("EXTINF")) {
        currentDuration = parseFloat(line.split(":")[1]);
      } else if (line.startsWith("http")) {
        if (currentDuration !== null) {
          segments.push({
            duration: currentDuration,
            url: line
          });
          currentDuration = null;
        }
      }
    }
    return {
      segments: segments,
      raw: data
    };
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
  const terabox = new MdiskFetcher();
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