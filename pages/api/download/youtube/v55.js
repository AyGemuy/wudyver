import axios from "axios";
import * as cheerio from "cheerio";
class YoutubeDownloader {
  constructor() {
    this.baseUrl = "https://ssyoutube.online";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`
    };
  }
  getVideoId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|(?:embed|v)\/))([^?\s&"'>]+)/);
    return match ? match[1] : null;
  }
  async download({
    url,
    quality = "360p"
  }) {
    try {
      console.log("[START] Proses download:", url);
      const videoId = this.getVideoId(url);
      if (!videoId) throw new Error("URL tidak valid.");
      const data = `videoURL=${encodeURIComponent(url)}`;
      const response = await axios.post(`${this.baseUrl}/yt-video-detail/`, data, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const $ = cheerio.load(response.data);
      const title = $(".videoTitle").text().trim();
      const thumbnail = $(".videoThumbnail img").attr("src");
      const duration = $(".duration label").text().replace("Duration:", "").trim();
      const availableQualities = [];
      $("table.list tbody tr").each((_, el) => {
        const q = $(el).find("td:nth-child(1)").text().replace(/\s+/g, " ").trim().toLowerCase();
        const size = $(el).find("td:nth-child(2)").text().trim();
        const btn = $(el).find(".downloadButton button");
        const dlUrl = btn.attr("data-url");
        const hasAudio = btn.attr("data-has-audio") === "true";
        if (dlUrl) {
          const cleanQ = q.includes("m4a") ? "m4a" : q.match(/\d+p/)?.[0] || q;
          availableQualities.push({
            quality: cleanQ,
            size: size,
            url: dlUrl,
            hasAudio: hasAudio
          });
        }
      });
      console.log("[INFO] Available Qualities:");
      availableQualities.forEach(q => console.log(`- ${q.quality} (${q.size}) ${q.hasAudio ? "✅ Audio" : "❌ No Audio"}`));
      let selectedQuality = availableQualities.find(q => q.quality === quality.toLowerCase());
      if (!selectedQuality) {
        if (quality.includes("p")) {
          const target = parseInt(quality);
          selectedQuality = availableQualities.filter(q => q.quality.match(/\d+p/)).sort((a, b) => parseInt(a.quality) - parseInt(b.quality)).find(q => parseInt(q.quality) >= target);
        } else if (quality === "m4a") {
          selectedQuality = availableQualities.find(q => q.quality === "m4a");
        }
      }
      if (!selectedQuality) {
        selectedQuality = availableQualities.find(q => q.quality === "360p") || availableQualities[0];
      }
      console.log("[INFO] Selected Quality:", selectedQuality);
      console.log("[DONE] Download URL tersedia");
      return {
        title: title,
        thumbnail: thumbnail,
        duration: duration,
        download: selectedQuality.url,
        availableQualities: availableQualities,
        selectedQuality: selectedQuality
      };
    } catch (err) {
      console.error("[ERROR]", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new YoutubeDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}