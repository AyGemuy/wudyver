import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
class MediaScraper {
  constructor() {
    this.api = axios.create({
      baseURL: "https://twmate.com",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
        Referer: "https://twmate.com/"
      }
    });
    console.log("[LOG] Instance MediaScraper telah dibuat.");
  }
  async _fetch(url) {
    console.log(`[LOG] Memulai proses fetch untuk URL: ${url}`);
    const postData = qs.stringify({
      page: url,
      ftype: "all",
      ajax: "1"
    });
    console.log("[LOG] Mengirim POST request...");
    const response = await this.api.post("/", postData);
    console.log("[LOG] Respon diterima dari server.");
    return response.data;
  }
  _parse(html) {
    console.log("[LOG] Memulai proses parsing HTML...");
    const $ = cheerio.load(html);
    const result = {};
    const media = [];
    result.title = $(".video-info h4")?.text()?.trim() || "Judul tidak ditemukan";
    result.thumb = $(".thumb-container img")?.attr("src") || null;
    result.duration = $(".video-info p span")?.first()?.text()?.replace("Duration :", "")?.trim() || null;
    result.likes = $(".video-info p span")?.eq(1)?.text()?.replace("Likes :", "")?.trim() || null;
    console.log(`[LOG] Metadata ditemukan: Judul - "${result.title}"`);
    const videoRows = $("table.files-table tbody tr");
    const imageCards = $(".card.icard");
    if (videoRows.length > 0) {
      console.log(`[LOG] Menemukan ${videoRows.length} tautan video.`);
      videoRows.each((_, el) => {
        const quality = $(el).find("td")?.eq(0)?.text()?.trim();
        const type = $(el).find("td")?.eq(1)?.text()?.trim();
        const link = $(el).find("a")?.attr("href");
        if (link) {
          media.push({
            mediaType: "video",
            quality: quality,
            type: type,
            link: link
          });
        }
      });
    }
    if (imageCards.length > 0) {
      console.log(`[LOG] Menemukan ${imageCards.length} tautan gambar.`);
      imageCards.each((_, el) => {
        const preview = $(el).find("img")?.attr("src");
        $(el).find("a.btn-dl").each((_, a) => {
          const link = $(a)?.attr("href");
          const size = $(a)?.text()?.replace("Download", "")?.trim();
          if (preview && link) {
            media.push({
              mediaType: "image",
              preview: preview,
              size: size,
              link: link
            });
          }
        });
      });
    }
    const hasVideo = media.some(m => m.mediaType === "video");
    const hasImage = media.some(m => m.mediaType === "image");
    result.type = hasVideo && hasImage ? "mixed" : hasVideo ? "video" : hasImage ? "image" : "unknown";
    result.media = media;
    console.log(`[LOG] Proses parsing selesai. Tipe konten: ${result.type}`);
    return result;
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`\n--- [PROSES DIMULAI] URL: ${url} ---`);
    try {
      const targetUrl = url || "";
      if (typeof targetUrl !== "string" || !targetUrl.includes("twitter.com")) {
        throw new TypeError("URL yang diberikan tidak valid atau bukan URL Twitter.");
      }
      const html = await this._fetch(targetUrl);
      const data = this._parse(html);
      console.log("--- [PROSES SELESAI] Sukses ---");
      return data;
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan pada proses download:", error.message);
      const statusCode = error?.response?.status;
      const errorData = error?.response?.data;
      console.error(`[ERROR] Detail: Status Code - ${statusCode || "N/A"}`);
      console.log("--- [PROSES SELESAI] Gagal ---");
      return {
        error: true,
        message: error.message,
        statusCode: statusCode || null,
        details: errorData || "Tidak ada detail tambahan."
      };
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
    const client = new MediaScraper();
    const response = await client.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}