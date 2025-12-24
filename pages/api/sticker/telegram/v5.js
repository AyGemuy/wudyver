import axios from "axios";
import * as cheerio from "cheerio";
class StickerScraper {
  constructor() {
    this.base_url = "https://fullyst.com";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID"
    };
  }
  async search({
    query,
    limit = 5,
    sticker = 10,
    total = 10,
    detail = true,
    ...rest
  }) {
    console.log("Memulai proses pencarian stiker...");
    try {
      const searchUrl = `${this.base_url}/id/stickers&search=${encodeURIComponent(query)}`;
      console.log(`Mengambil data dari: ${searchUrl}`);
      const response = await axios.get(searchUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      console.log("Berhasil mem-parsing HTML.");
      let results = [];
      const stickerSets = $(".sticker-set").slice(0, limit);
      console.log(`Menemukan ${stickerSets.length} set stiker.`);
      for (const element of stickerSets.get()) {
        const title = $(element).find("h2").text()?.trim() || "Tanpa Judul";
        const stickerLink = $(element).find("a.btn-stickers").attr("href");
        const setName = stickerLink?.split("/").pop();
        if (!setName) continue;
        let stickerDetails = {
          title: title,
          set_name: setName,
          set_url: `${this.base_url}${stickerLink}`,
          stickers: []
        };
        if (detail) {
          console.log(`Mengambil detail untuk set: ${title}`);
          const detailUrl = `${this.base_url}/receiver/stickers`;
          const params = new URLSearchParams();
          params.append("set", setName);
          params.append("stickers", total.toString());
          params.append("limit", sticker.toString());
          const detailResponse = await axios.post(detailUrl, params, {
            headers: {
              ...this.headers,
              "Content-Type": "application/x-www-form-urlencoded",
              Origin: this.base_url,
              Referer: `${this.base_url}${stickerLink}`
            }
          });
          const stickerData = detailResponse.data?.[0];
          const setInfo = stickerData?.set;
          const stickers = stickerData?.stickers;
          if (setInfo && stickers) {
            stickerDetails.stickers = stickers.map(sticker => {
              const isVideo = sticker.video === "1";
              const fileExtension = isVideo ? "webm" : "webp";
              const stickerUrl = `https://stickers.fullyst.com/${setInfo.uuid}/${isVideo ? "full" : "thumb"}/${isVideo ? sticker.file_uid : sticker.thumb_uid}.${fileExtension}`;
              return {
                emoji: sticker.emoji || "❓",
                url: stickerUrl,
                is_animated: sticker.animated === "1",
                is_video: isVideo
              };
            });
          }
        }
        results.push(stickerDetails);
      }
      console.log("Proses pencarian selesai.");
      return results;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses scraping:", error.message);
      const status = error.response?.status || "Tidak ada status";
      const data = error.response?.data || "Tidak ada data";
      console.error(`Detail Kesalahan: Status - ${status}`);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const scraper = new StickerScraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}