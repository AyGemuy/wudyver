import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class Downloader {
  constructor() {
    this.client = axios.create({
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
      }
    });
  }
  async download({
    url
  }) {
    try {
      const proxyUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=${encodeURIComponent(url)}`;
      console.log("🔍 Mengambil halaman melalui proxy:", proxyUrl);
      const res = await this.client.get(proxyUrl);
      if (res.status !== 200) {
        throw new Error(`Status Error: ${res.status}`);
      }
      const $ = cheerio.load(res.data);
      const postContainer = $('div[data-pressable-container="true"]').first();
      if (postContainer.length === 0) {
        throw new Error("⚠️ Container postingan utama tidak ditemukan. Struktur HTML mungkin telah berubah.");
      }
      const authorLink = postContainer.find('a[href^="/@"]');
      const authorName = authorLink.find('span[dir="auto"]').first().text();
      const authorUsername = authorLink.find('span[translate="no"]').text();
      const authorAvatar = authorLink.find("img").attr("src");
      const author = {
        name: authorName,
        username: authorUsername,
        avatar_url: authorAvatar
      };
      const timeElement = postContainer.find("time");
      const taken_at = timeElement.attr("datetime");
      const short_code = url.split("/").filter(Boolean).pop();
      let fullCaption = "";
      postContainer.find('div[class*="x1a6qonq"] > span').each((i, elem) => {
        fullCaption += $(elem).text() + " ";
      });
      const attachments = [];
      const videoSrc = $("video").attr("src");
      const thumbnailSrc = $("video").parent().parent().find("img").attr("src");
      if (videoSrc) {
        attachments.push({
          type: "Video",
          url: videoSrc,
          thumbnail_url: thumbnailSrc
        });
      }
      if (attachments.length === 0) {
        $('div[class*="x1xmf6yo"] img').each((i, elem) => {
          const imgSrc = $(elem).attr("src");
          if (imgSrc && !attachments.some(att => att.url === imgSrc)) {
            attachments.push({
              type: "Photo",
              url: imgSrc
            });
          }
        });
      }
      const statsContainer = postContainer.find('div[class*="x4vbgl9"]');
      const like_count = statsContainer.find("> div > div").eq(0).text() || "0";
      const reply_count = statsContainer.find("> div > div").eq(1).text() || "0";
      const repost_count = statsContainer.find("> div > div").eq(2).text() || "0";
      const quote_count = statsContainer.find("> div > div").eq(3).text() || "0";
      let view_count = "0";
      const viewCountElement = $('h1:contains("Thread")').next("div").find('span:contains("views")');
      if (viewCountElement.length > 0) {
        view_count = viewCountElement.first().text().replace(/ views/i, "").trim();
      }
      if (!author.username && attachments.length === 0) {
        throw new Error("⚠️ Tidak dapat menemukan data postingan. Struktur HTML mungkin telah berubah.");
      }
      return {
        short_code: short_code,
        message: fullCaption.trim() || "Tidak ada caption",
        author: author,
        taken_at: taken_at,
        stats: {
          like_count: like_count,
          reply_count: reply_count,
          repost_count: repost_count,
          quote_count: quote_count,
          view_count: view_count
        },
        attachments: attachments
      };
    } catch (err) {
      console.error("❌ Gagal memproses:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}