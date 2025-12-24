import fetch from "node-fetch";
class StickerCloud {
  constructor() {
    this.api = "https://api.stickers.cloud/v1/packs";
    this.headers = {
      Authority: "api.stickers.cloud",
      Accept: "application/json, text/plain, */*",
      Origin: "https://stickers.cloud",
      "User-Agent": "Postify/1.0.0"
    };
  }
  async fetchData(endpoint, params = {}) {
    const url = new URL(`${this.api}${endpoint}`);
    url.search = new URLSearchParams(params).toString();
    try {
      const response = await fetch(url, {
        headers: this.headers
      });
      const data = await response.json();
      if (!data.success || Array.isArray(data.result) && data.result.length === 0) {
        return {
          success: false,
          result: {
            message: "Sticker nya gak ada. Coba pake keyword lain dahh."
          }
        };
      }
      return data;
    } catch (error) {
      const message = error instanceof TypeError ? "Page nya gak ada woy, coba kurangi lagi input nya." : "Error euy.";
      return {
        success: false,
        result: {
          message: message
        }
      };
    }
  }
  async search(query, page = 1) {
    return await this.fetchData("/search", {
      query: query,
      page: page
    });
  }
  async pack(slug) {
    return await this.fetchData(`/slug/${slug}`);
  }
}
export default async function handler(req, res) {
  try {
    const {
      type,
      query: searchQuery,
      slug,
      page
    } = req.method === "GET" ? req.query : req.body;
    const stickerCloud = new StickerCloud();
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Paramenter 'type' dibutuhkan ('search' atau 'slug')."
      });
    }
    switch (type) {
      case "search":
        if (!searchQuery) {
          return res.status(400).json({
            success: false,
            message: "Paramenter 'query' dibutuhkan untuk pencarian."
          });
        }
        const searchResult = await stickerCloud.search(searchQuery, page || 1);
        return res.status(200).json(searchResult);
      case "slug":
        if (!slug) {
          return res.status(400).json({
            success: false,
            message: "Paramenter 'slug' dibutuhkan untuk mengambil pack."
          });
        }
        const packResult = await stickerCloud.pack(slug);
        return res.status(200).json(packResult);
      default:
        return res.status(400).json({
          success: false,
          message: `Nilai 'type' "${type}" tidak valid. Gunakan 'search' atau 'slug'.`
        });
    }
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      message: "Kesalahan server internal"
    });
  }
}