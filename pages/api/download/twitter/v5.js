import axios from "axios";
import * as cheerio from "cheerio";
class XSaver {
  constructor() {
    this.baseUrl = "https://www.xsaver.io/x-downloader/download.php";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9",
      referer: "https://www.xsaver.io/x-downloader/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url: twitterUrl
  }) {
    try {
      console.log(`[⏳] XSaver Fetching: ${twitterUrl}`);
      const response = await axios.get(this.baseUrl, {
        params: {
          url: twitterUrl
        },
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = {
        title: $(".video-title").text().trim(),
        thumbnail: $(".video-thumbnail img").attr("src"),
        downloads: []
      };
      $(".video-card a.download-bttn").each((i, el) => {
        const rawLink = $(el).attr("href");
        let cleanLink = rawLink;
        if (rawLink.includes("force-save.php?url=")) {
          cleanLink = decodeURIComponent(rawLink.split("url=")[1]);
        }
        const text = $(el).text().trim();
        results.downloads.push({
          type: text.includes("Video") ? "video" : "image",
          label: text,
          url: cleanLink
        });
      });
      return {
        status: "success",
        source: "XSaver",
        data: results
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message
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
  const api = new XSaver();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}