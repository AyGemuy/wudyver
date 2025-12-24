import axios from "axios";
import * as cheerio from "cheerio";
class YouTubeDetail {
  constructor() {
    this.baseURL = "https://ssyoutube.online/yt-video-detail/";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://ssyoutube.online",
      referer: "https://ssyoutube.online/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async detail(videoURL) {
    try {
      const data = new URLSearchParams({
        videoURL: videoURL
      });
      const response = await axios.post(this.baseURL, data.toString(), {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const videoDetails = $(".videoDetail").map((_, el) => {
        const rawDuration = $(".duration label", el).text().replace(/Duration:/i, "").trim() || "00:00";
        const options = [];
        $("table.list tr:not(.mobile-header)").each((i, row) => {
          const type = $(row).find("td").eq(0).text().trim();
          const size = $(row).find("td").eq(1).text().trim();
          const downloadLink = $(row).find("td").eq(2).find("button").attr("onclick")?.match(/'(https:\/\/.+?)'/)?.[1];
          if (type && size && downloadLink) {
            options.push({
              type: type,
              size: size,
              link: downloadLink
            });
          }
        });
        return {
          title: $(".videoTitle", el).text().trim() || "Tidak tersedia",
          duration: rawDuration,
          views: $(".view", el).text().trim() || "0",
          likes: $(".like", el).text().trim() || "0",
          comments: $(".comment", el).text().trim() || "0",
          thumbnail: $(".videoThumbnail img", el).attr("src") || "https://via.placeholder.com/150",
          downloads: options
        };
      }).get();
      return videoDetails;
    } catch (error) {
      console.error("Error:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "Invalid YouTube URL"
  });
  try {
    const cnv = new YouTubeDetail();
    const result = await cnv.detail(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}