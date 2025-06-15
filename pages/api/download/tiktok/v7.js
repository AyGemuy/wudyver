import axios from "axios";
import * as cheerio from "cheerio";
class TTSave {
  constructor() {
    this.headers = {
      authority: "ttsave.app",
      accept: "application/json, text/plain, */*",
      origin: "https://ttsave.app",
      referer: "https://ttsave.app/en",
      "user-agent": "Postify/1.0.0"
    };
  }
  async submit(url, referer) {
    try {
      const headers = {
        ...this.headers,
        referer: referer
      };
      const data = {
        query: url,
        language_id: "1"
      };
      const response = await axios.post("https://ttsave.app/download", data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to submit request");
    }
  }
  parse(html) {
    const $ = cheerio.load(html);
    return {
      uniqueId: $("#unique-id").val(),
      nickname: $("h2.font-extrabold").text(),
      profilePic: $("img.rounded-full").attr("src"),
      username: $("a.font-extrabold.text-blue-400").text(),
      description: $("p.text-gray-600").text(),
      dlink: {
        nowm: $("a.w-full.text-white.font-bold").first().attr("href"),
        wm: $("a.w-full.text-white.font-bold").eq(1).attr("href"),
        audio: $('a[type="audio"]').attr("href"),
        profilePic: $('a[type="profile"]').attr("href"),
        cover: $('a[type="cover"]').attr("href")
      },
      stats: this.extractStats($),
      songTitle: $(".flex.flex-row.items-center.justify-center.gap-1.mt-5 span.text-gray-500").text().trim(),
      slides: $('a[type="slide"]').map((i, el) => ({
        number: i + 1,
        url: $(el).attr("href")
      })).get()
    };
  }
  extractStats($) {
    const stats = {
      plays: "",
      likes: "",
      comments: "",
      shares: ""
    };
    $(".flex.flex-row.items-center.justify-center").each((_, el) => {
      const value = $(el).find("span.text-gray-500").text().trim();
      const svgPath = $(el).find("svg path").attr("d");
      if (!svgPath) return;
      if (svgPath.startsWith("M10 18a8 8 0 100-16")) stats.plays = value;
      else if (svgPath.startsWith("M3.172 5.172a4 4 0 015.656")) stats.likes = value || "0";
      else if (svgPath.startsWith("M18 10c0 3.866-3.582")) stats.comments = value;
      else if (svgPath.startsWith("M17.593 3.322c1.1.128")) stats.shares = value;
    });
    return stats;
  }
  async fetchData(link, referer) {
    const html = await this.submit(link, referer);
    return this.parse(html);
  }
  async video(link) {
    const result = await this.fetchData(link, "https://ttsave.app/en");
    return {
      type: "video",
      ...result,
      videoInfo: {
        nowm: result.dlink.nowm,
        wm: result.dlink.wm
      }
    };
  }
  async mp3(link) {
    const result = await this.fetchData(link, "https://ttsave.app/en/mp3");
    return {
      type: "audio",
      ...result,
      audioUrl: result.dlink.audio,
      coverUrl: result.dlink.cover
    };
  }
  async slide(link) {
    const result = await this.fetchData(link, "https://ttsave.app/en");
    if (result.slides.length === 0) throw new Error("Link bukan slide image TikTok");
    return {
      type: "slide",
      ...result,
      coverUrl: result.dlink.cover
    };
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    url: link,
    type = "video"
  } = method === "GET" ? req.query : req.body;
  if (!link) return res.status(400).json({
    error: "Missing url parameter"
  });
  try {
    const ttsave = new TTSave();
    let result;
    switch (type) {
      case "video":
        result = await ttsave.video(link);
        break;
      case "mp3":
        result = await ttsave.mp3(link);
        break;
      case "slide":
        result = await ttsave.slide(link);
        break;
      default:
        return res.status(400).json({
          error: "Invalid type. Use video, mp3, or slide"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}