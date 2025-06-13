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
const search = async (query, page = 1) => {
  const stickerCloud = new StickerCloud();
  try {
    return await stickerCloud.search(query, page);
  } catch (error) {
    console.error("Error during search:", error);
    throw error;
  }
};
const pack = async slug => {
  const stickerCloud = new StickerCloud();
  try {
    return await stickerCloud.pack(slug);
  } catch (error) {
    console.error("Error fetching pack:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    url,
    type
  } = req.method === "GET" ? req.query : req.body;
  if (!(url || type)) return res.status(400).json({
    message: "No url, type provided"
  });
  const result = type && type === "pack" ? await pack(url) : await search(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}