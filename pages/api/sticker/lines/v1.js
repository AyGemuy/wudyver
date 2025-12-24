import axios from "axios";
class LineStickerSearch {
  constructor() {
    this.baseUrl = "https://store.line.me/api/search/sticker";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      referer: "https://store.line.me/search/id?q=Bear"
    };
  }
  async search({
    query = "Bear",
    offset = 0,
    limit = 36
  }) {
    try {
      const params = {
        category: "sticker",
        type: "ALL",
        offset: offset,
        limit: limit,
        includeFacets: true,
        query: query
      };
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        params: params
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching stickers:", error.message);
      throw new Error("Failed to fetch stickers");
    }
  }
}
export default async function handler(req, res) {
  const {
    query = "Bear",
      offset = 0,
      limit = 36
  } = req.method === "GET" ? req.query : req.body;
  const stickerSearch = new LineStickerSearch();
  try {
    const data = await stickerSearch.search({
      query: query,
      offset: offset,
      limit: limit
    });
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}