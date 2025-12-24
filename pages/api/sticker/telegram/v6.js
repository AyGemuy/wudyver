import axios from "axios";
import * as cheerio from "cheerio";
class ChpicScraper {
  constructor() {
    this.client = axios.create({
      baseURL: "https://chpic.su",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID"
      }
    });
    console.log(" scraper diinisialisasi.");
  }
  async _gp(q) {
    try {
      console.log(`- Mengambil daftar paket untuk query: "${q}"`);
      const response = await this.client.get(`/en/search/?searchModule=stickers&q=${q}`);
      const $ = cheerio.load(response.data);
      const packs = [];
      $(".collections_list_item").each((i, el) => {
        const title = $(el).find(".textsblock .title a")?.text()?.trim() || "Judul Tidak Ditemukan";
        const url = $(el).find(".textsblock .title a")?.attr("href");
        const id = $(el).find(".textsblock .collectionid span")?.text()?.trim() || null;
        const count = $(el).find(".textsblock .subtitle")?.text()?.trim() || "N/A";
        const isAnimated = $(el).find(".statuses .animated")?.length > 0;
        const isVideo = $(el).find(".statuses .video")?.length > 0;
        const type = isVideo ? "Video" : isAnimated ? "Animated" : "Static";
        if (url) {
          packs.push({
            title: title,
            id: id,
            url: url,
            count: count,
            type: type
          });
        }
      });
      console.log(`- Ditemukan ${packs.length} paket stiker.`);
      return packs;
    } catch (error) {
      console.error(" Error saat mengambil daftar paket:", error.message);
      return [];
    }
  }
  async _gd(u) {
    if (!u) return {
      stickers: []
    };
    try {
      console.log(` -- Mengambil detail untuk paket: ${u}`);
      const response = await this.client.get(`${u}?show_all=true`);
      const $ = cheerio.load(response.data);
      const stickers = [];
      $(".stickers_list_item").not(".tgchannel").each((i, el) => {
        const stickerUrl = $(el).find("a")?.attr("href");
        const emoji = $(el).find(".emoji span")?.text()?.trim() || "N/A";
        const image = $(el).find("img")?.attr("src") || $(el).find("tgs-player")?.attr("src") || null;
        if (stickerUrl && image) {
          stickers.push({
            url: stickerUrl,
            image: image,
            emoji: emoji
          });
        }
      });
      console.log(` --- Ditemukan ${stickers.length} stiker di dalam paket.`);
      return {
        stickers: stickers
      };
    } catch (error) {
      console.error(` Error saat mengambil detail untuk ${u}:`, error.message);
      return {
        stickers: []
      };
    }
  }
  async _gsl(u) {
    if (!u) return {};
    try {
      console.log(` --- Mengambil detail unduhan dari: ${u}`);
      const response = await this.client.get(u);
      const $ = cheerio.load(response.data);
      const links = {};
      $(".stickerActions__item a").each((i, el) => {
        const href = $(el).attr("href");
        if (href && !href.startsWith("javascript:")) {
          const format = $(el).find(".fileFormat").text().trim();
          if (format) {
            links[format] = this.client.defaults.baseURL + href;
          }
        }
      });
      return links;
    } catch (error) {
      console.error(` ---- Error saat mengambil tautan dari ${u}:`, error.message);
      return {};
    }
  }
  async search({
    query,
    limit = 5,
    detail = true
  }) {
    console.log(`\nMemulai pencarian baru dengan query: "${query}", limit: ${limit}, detail: ${detail}`);
    if (!query) {
      console.error("Error: Query tidak boleh kosong.");
      return [];
    }
    try {
      const packs = await this._gp(query);
      if (!packs.length) return [];
      const limitedPacks = packs.slice(0, limit);
      if (!detail) return limitedPacks;
      console.log("- Memulai pengambilan detail untuk setiap paket (sekuensial)...");
      const detailedResults = [];
      for (const pack of limitedPacks) {
        const details = await this._gd(pack.url);
        detailedResults.push({
          ...pack,
          ...details
        });
      }
      console.log("Pencarian dengan detail selesai.");
      return detailedResults;
    } catch (error) {
      console.error(" Terjadi error pada proses pencarian utama:", error.message);
      return [];
    }
  }
  async download({
    id,
    limit = 0,
    detail = false
  }) {
    console.log(`\nMemulai proses unduh untuk ID: "${id}", detail: ${detail}`);
    if (!id) {
      console.error("Error: ID paket tidak boleh kosong.");
      return null;
    }
    try {
      const packUrl = `/en/stickers/${id}/?show_all=true`;
      console.log(`- Mengambil daftar stiker dari: ${packUrl}`);
      const response = await this.client.get(packUrl);
      const $ = cheerio.load(response.data);
      const packTitle = $("div.collection_head h1")?.text()?.trim() || "Judul Paket Tidak Ditemukan";
      let stickerItems = [];
      $(".stickers_list .stickers_list_item").not(".tgchannel").each((i, el) => {
        const pageUrl = $(el).find("a")?.attr("href");
        const emoji = $(el).find(".emoji span")?.text()?.trim() || "N/A";
        const previewUrl = $(el).find("tgs-player")?.attr("src") || $(el).find("video source")?.attr("src") || $(el).find("img")?.attr("src") || null;
        if (pageUrl && previewUrl) {
          stickerItems.push({
            pageUrl: pageUrl,
            emoji: emoji,
            previewUrl: previewUrl
          });
        }
      });
      console.log(`- Ditemukan total ${stickerItems.length} stiker.`);
      const limitedStickers = limit > 0 ? stickerItems.slice(0, limit) : stickerItems;
      if (limit > 0) {
        console.log(`- Menerapkan limit, memproses ${limitedStickers.length} stiker.`);
      }
      if (detail) {
        console.log("- Memulai pengambilan link unduhan detail (memakan waktu)...");
        const finalStickers = [];
        for (const sticker of limitedStickers) {
          const downloadLinks = await this._gsl(sticker.pageUrl);
          finalStickers.push({
            ...sticker,
            pageUrl: this.client.defaults.baseURL + sticker.pageUrl,
            downloadLinks: Object.keys(downloadLinks).length > 0 ? downloadLinks : "Tidak ditemukan"
          });
        }
        stickerItems = finalStickers;
      } else {
        stickerItems = limitedStickers.map(s => ({
          ...s,
          pageUrl: this.client.defaults.baseURL + s.pageUrl
        }));
      }
      return {
        packTitle: packTitle,
        packId: id,
        stickerCount: stickerItems.length,
        stickers: stickerItems
      };
    } catch (error) {
      console.error(` Terjadi error saat mengunduh paket ID ${id}:`, error.message);
      if (error.response?.status === 404) {
        console.error(`- Paket dengan ID "${id}" tidak ditemukan (404).`);
      }
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi. Pilihan: 'search', 'download'."
    });
  }
  const scraper = new ChpicScraper();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await scraper.search(params);
        return res.status(200).json(response);
      case "download":
        if (!params.id) {
          return res.status(400).json({
            error: "Paramenter 'id' wajib diisi untuk action 'download'."
          });
        }
        response = await scraper.download(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'download'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}