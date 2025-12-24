import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class StickerSearch {
  constructor() {
    this.baseProxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=`;
    this.axiosInstance = axios.create({
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.37.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/5.37.36"
      }
    });
  }
  _parseTagsFromAlt(altText) {
    if (!altText) return [];
    try {
      const parts = altText.split(" ");
      if (parts.length < 3) return [];
      const tagString = parts.slice(2).join(" ");
      const cleanedTagString = tagString.replace(/telegram sticker$/i, "").trim();
      if (!cleanedTagString) return [];
      return cleanedTagString.split(",").map(tag => tag.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  async search({
    query,
    limit = 3,
    detail = true
  }) {
    console.log(`[INFO] Memulai pencarian untuk: "${query}"`);
    try {
      const targetSearchUrl = `https://stickers.wiki/telegram/search/?q=${encodeURIComponent(query)}`;
      const proxySearchUrl = `${this.baseProxy}${encodeURIComponent(targetSearchUrl)}`;
      console.log(`[FETCH] Mengambil daftar paket dari halaman pencarian...`);
      const {
        data: searchHtml
      } = await this.axiosInstance.get(proxySearchUrl);
      const $ = cheerio.load(searchHtml);
      const parsedResults = [];
      $("#search-results a:has(div.bg-day2)").each((i, element) => {
        const link = $(element);
        const href = link.attr("href");
        if (href && href.startsWith("/telegram/")) {
          const slug = href.split("/")[2];
          const title = link.find("h3").text().trim();
          const total = parseInt(link.find("span.text-xs").text().trim(), 10) || 0;
          const pack_icon_url = link.find("img").attr("src") || null;
          if (slug && title) {
            parsedResults.push({
              slug: slug,
              title: title,
              total: total,
              pack_icon_url: pack_icon_url,
              author: null,
              addToTelegramLink: null,
              stickers: []
            });
          }
        }
      });
      if (parsedResults.length === 0) {
        console.log("[WARN] Tidak ada paket stiker yang ditemukan.");
        return [];
      }
      console.log(`[SUCCESS] Ditemukan ${parsedResults.length} paket stiker.`);
      const limitedResults = parsedResults.slice(0, limit);
      if (!detail) {
        console.log("[INFO] Proses selesai (tanpa detail).");
        return limitedResults;
      }
      console.log(`[FETCH] Mengambil detail untuk ${limitedResults.length} paket teratas...`);
      for (const item of limitedResults) {
        try {
          const targetDetailUrl = `https://stickers.wiki/telegram/${item.slug}/`;
          const proxyDetailUrl = `${this.baseProxy}${encodeURIComponent(targetDetailUrl)}`;
          const {
            data: detailHtml
          } = await this.axiosInstance.get(proxyDetailUrl);
          const $$ = cheerio.load(detailHtml);
          const detailTitle = $$("main h1").text().trim();
          if (detailTitle) item.title = detailTitle;
          const authorMatch = item.title.match(/@(\w+)/);
          item.author = authorMatch ? authorMatch[0] : null;
          let telegramLink = $$('a[href^="https://t.me/addstickers/"]').attr("href");
          if (!telegramLink) {
            telegramLink = $$("#floating-install a").attr("href");
          }
          item.addToTelegramLink = telegramLink || null;
          $$("main .grid div[onclick] img, main .grid > div > div > img[src]").each((i, el) => {
            const stickerElement = $$(el);
            let stickerUrl = stickerElement.attr("src");
            let tags = [];
            if (stickerUrl) {
              stickerUrl = stickerUrl.replace(".thumb.", ".");
            }
            tags = this._parseTagsFromAlt(stickerElement.attr("alt"));
            if (tags.length === 0) {
              const scriptContent = stickerElement.next('script[type="application/ld+json"]').html();
              if (scriptContent) {
                try {
                  const jsonData = JSON.parse(scriptContent);
                  const description = jsonData?.description || "";
                  tags = description.split(",").map(t => t.trim()).filter(t => t && t.toLowerCase() !== "telegram sticker");
                } catch {}
              }
            }
            if (stickerUrl) {
              item.stickers.push({
                url: stickerUrl,
                tags: tags
              });
            }
          });
          console.log(`  - [OK] "${item.slug}" (${item.stickers.length} stiker)`);
        } catch (detailError) {
          console.error(`  - [FAIL] Gagal mengambil detail untuk "${item.slug}": ${detailError.message}`);
        }
      }
      console.log(`[SUCCESS] Proses pencarian selesai.`);
      return limitedResults;
    } catch (error) {
      console.error(`[FATAL] Terjadi kesalahan: ${error.message}`);
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
    const sticker = new StickerSearch();
    const response = await sticker.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}