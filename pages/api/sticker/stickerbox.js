import axios from "axios";
class StickerBox {
  constructor(cfg = {}) {
    this.base = cfg.base || "https://www.stickerbox.tgsurf.com";
    this.lang = cfg.lang || "en";
    this.ax = axios.create({
      baseURL: this.base,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async req({
    url,
    ...rest
  }) {
    try {
      console.log(`[REQ] ${url}`);
      const res = await this.ax({
        url: url,
        ...rest
      });
      console.log(`[OK] ${url} - ${res?.status || "N/A"}`);
      return res?.data || res;
    } catch (err) {
      console.error(`[ERR] ${url} - ${err?.message || "Unknown"}`);
      throw err;
    }
  }
  async categories({
    lang
  } = {}) {
    try {
      const l = lang || this.lang;
      return await this.req({
        url: `/stickers/categories?languageCode=${l}`
      });
    } catch (err) {
      console.error(`[categories] ${err?.message || "Failed"}`);
      throw err;
    }
  }
  async recommendations({
    lang
  } = {}) {
    try {
      const l = lang || this.lang;
      return await this.req({
        url: `/recommendations?languageCode=${l}`
      });
    } catch (err) {
      console.error(`[recommendations] ${err?.message || "Failed"}`);
      throw err;
    }
  }
  async search({
    page = 1,
    title,
    ...opts
  } = {}) {
    try {
      const q = new URLSearchParams({
        page: page,
        title: title,
        ...opts
      }).toString();
      return await this.req({
        url: `/stickers/search?${q}`
      });
    } catch (err) {
      console.error(`[search] ${err?.message || "Failed"}`);
      throw err;
    }
  }
  async cards_tags({
    lang
  } = {}) {
    try {
      const l = lang || this.lang;
      return await this.req({
        url: `/greetingCards/tags?languageCode=${l}`
      });
    } catch (err) {
      console.error(`[cards_tags] ${err?.message || "Failed"}`);
      throw err;
    }
  }
  async cards({
    page = 1,
    tagId,
    ...opts
  } = {}) {
    try {
      const q = new URLSearchParams({
        page: page,
        tagId: tagId,
        ...opts
      }).toString();
      return await this.req({
        url: `/greetingCards?${q}`
      });
    } catch (err) {
      console.error(`[cards] ${err?.message || "Failed"}`);
      throw err;
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
      error: "Parameter 'action' wajib diisi.",
      actions: ["categories", "recommendations", "search", "cards_tags", "cards"]
    });
  }
  const api = new StickerBox(params);
  try {
    let response;
    switch (action) {
      case "categories":
        console.log("[ACTION] Getting categories");
        response = await api.categories(params);
        break;
      case "recommendations":
        console.log("[ACTION] Getting recommendations");
        response = await api.recommendations(params);
        break;
      case "search":
        if (!params.title) {
          return res.status(400).json({
            error: "Parameter 'title' wajib untuk action 'search'.",
            example: "action=search&title=cat&page=1"
          });
        }
        console.log("[ACTION] Searching stickers:", params.title);
        response = await api.search(params);
        break;
      case "cards_tags":
        console.log("[ACTION] Getting greeting card cards_tags");
        response = await api.cards_tags(params);
        break;
      case "cards":
        if (!params.tagId) {
          return res.status(400).json({
            error: "Parameter 'tagId' wajib untuk action 'cards'.",
            example: "action=cards&tagId=5&page=1"
          });
        }
        console.log("[ACTION] Getting greeting cards for tag:", params.tagId);
        response = await api.cards(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supported: ["categories", "recommendations", "search", "cards_tags", "cards"],
          examples: {
            categories: "?action=categories&lang=en",
            recommendations: "?action=recommendations&lang=id",
            search: "?action=search&title=cat&page=1",
            cards_tags: "?action=cards_tags&lang=en",
            cards: "?action=cards&tagId=5&page=1"
          }
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error?.message || error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal.",
      action: action,
      params: Object.keys(params)
    });
  }
}