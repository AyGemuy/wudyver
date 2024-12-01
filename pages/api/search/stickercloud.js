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
const stickerCloud = new StickerCloud();

const search = async (query, page = 1) => {
    try {
        return await stickerCloud.search(query, page);
    } catch (error) {
        console.error('Error during search:', error);
        throw error;
    }
};

const pack = async (slug) => {
    try {
        return await stickerCloud.pack(slug);
    } catch (error) {
        console.error('Error fetching pack:', error);
        throw error;
    }
};

export default async function handler(req, res) {
  const { method, query } = req;

  if (method === "GET") {
    try {
      const { type, query: searchQuery, slug, page } = query;

      if (!type) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'type' is required. It can be 'search' or 'slug'."
        });
      }

      let result;

      if (type === "search" && searchQuery) {
        result = await search(searchQuery, page || 1);
      }
      else if (type === "slug" && slug) {
        result = await pack(slug);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid parameters. Ensure 'query' or 'slug' is provided."
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("API error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }
}
