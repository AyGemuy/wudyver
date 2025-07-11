import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
  }
  async downloadTrack(songUrl) {
    try {
      const headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.forhub.io",
        referer: "https://www.forhub.io/soundcloud/en/",
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
      const postData = new URLSearchParams();
      postData.append("formurl", songUrl);
      const response = await this.client.post("https://www.forhub.io/download.php", postData.toString(), {
        headers: headers
      });
      const $ = cheerio.load(response.data);
      const tableData = $("table tbody tr").map((idx, el) => {
        const trackImage = $(el).find("td img").attr("src") || "";
        const trackTitle = $(el).find("td").eq(1).text().trim() || "Unknown";
        const bitrate = $(el).find("td").eq(2).text().trim() || "Unknown";
        const downloadLink = $(el).find("td a").attr("href") || "";
        return {
          trackImage: trackImage,
          trackTitle: trackTitle,
          bitrate: bitrate,
          downloadLink: downloadLink
        };
      }).get();
      const trackData = tableData;
      const result = {
        ...trackData[0],
        downloadLink: trackData[1].downloadLink
      };
      return result;
    } catch (error) {
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
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}