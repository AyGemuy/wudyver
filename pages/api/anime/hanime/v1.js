import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-url";
class HanimeAPI {
  constructor() {
    this.config = {
      base: "https://hanime.tv",
      endpoints: {
        search: "https://search.htv-services.com",
        api: "/api/v8"
      }
    };
    const corsProxy = PROXY.url;
    console.log("CORS proxy", PROXY.url);
    this.searchClient = axios.create({
      baseURL: `${corsProxy}/${this.config.endpoints.search}`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Origin: this.config.base,
        Referer: `${this.config.base}/`,
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.apiClient = axios.create({
      baseURL: `${corsProxy}/${this.config.base}${this.config.endpoints.api}`
    });
  }
  _getApiHeaders() {
    return {
      headers: {
        "X-Signature-Version": "web2",
        "X-Signature": crypto.randomBytes(32).toString("hex"),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      }
    };
  }
  async search({
    query,
    ...rest
  }) {
    console.log(`[Proses] Mencari dengan query: "${query}"...`);
    try {
      const payload = {
        search_text: query || "",
        tags: rest.tags || [],
        tags_mode: rest.tags_mode === "OR" ? "OR" : "AND",
        brands: rest.brands || [],
        blacklist: rest.blacklist || [],
        order_by: rest.orderBy || "created_at_unix",
        ordering: rest.ordering || "desc",
        page: rest.page || 0
      };
      const response = await this.searchClient.post("/search", payload);
      console.log("[Proses] Pencarian berhasil.");
      const result = response.data;
      if (result.hits && typeof result.hits === "string") {
        result.hits = JSON.parse(result.hits);
      }
      return result;
    } catch (error) {
      console.error("[Error] Gagal melakukan pencarian:", error.response?.data || error.message);
      return null;
    }
  }
  async detail({
    slug
  }) {
    if (!slug) {
      console.error("[Error] Slug atau ID video diperlukan.");
      return null;
    }
    console.log(`[Proses] Mengambil detail untuk slug: "${slug}"...`);
    try {
      const response = await this.apiClient.get(`/video?id=${slug}`, this._getApiHeaders());
      console.log("[Proses] Pengambilan detail berhasil.");
      return response?.data;
    } catch (error) {
      console.error("[Error] Gagal mengambil detail video:", error.response?.data || error.message);
      return null;
    }
  }
  async franchiseVideos({
    slug
  }) {
    console.log(`[Proses] Mengambil franchise untuk slug: "${slug}"...`);
    try {
      const detailData = await this.detail({
        slug: slug
      });
      return detailData?.hentai_franchise_hentai_videos || null;
    } catch (error) {
      console.error("[Error] Gagal mengambil video franchise:", error.message);
      return null;
    }
  }
  async getVideoStreams({
    slug
  }) {
    if (!slug) {
      console.error("[Error] Slug video diperlukan.");
      return null;
    }
    console.log(`[Proses] Mengambil stream untuk slug: "${slug}" (Endpoint Publik)...`);
    try {
      const detailData = await this.detail({
        slug: slug
      });
      if (detailData?.videos_manifest) {
        console.log("[Proses] Pengambilan stream publik berhasil.");
        return detailData.videos_manifest;
      } else {
        console.error('[Error] Gagal mengambil stream publik: "videos_manifest" tidak ditemukan.');
        return null;
      }
    } catch (error) {
      console.error("[Error] Gagal mengambil stream publik:", error.response?.data || error.message);
      return null;
    }
  }
  async trending({
    time = "month",
    page = 0
  }) {
    console.log(`[Proses] Mengambil video tren untuk rentang waktu: "${time}"...`);
    try {
      const response = await this.apiClient.get(`/trending?time=${time}&page=${page}`, this._getApiHeaders());
      console.log("[Proses] Pengambilan video tren berhasil.");
      return response.data;
    } catch (error) {
      console.error("[Error] Gagal mengambil video tren:", error.response?.data || error.message);
      return null;
    }
  }
  async browse({
    type = "hentai-videos",
    category = "new-uploads",
    page = 0
  }) {
    console.log(`[Proses] Menjelajahi video dengan tipe: "${type}" dan kategori: "${category}"...`);
    try {
      const response = await this.apiClient.get(`/browse/${type}/${category}?page=${page}`, this._getApiHeaders());
      console.log("[Proses] Penjelajahan video berhasil.");
      return response.data;
    } catch (error) {
      console.error("[Error] Gagal menjelajahi video:", error.response?.data || error.message);
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new HanimeAPI();
  const validActions = ["search", "detail", "trending", "browse", "franchise", "streams"];
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.slug) {
          return res.status(400).json({
            error: "Paramenter 'slug' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "franchise":
        if (!params.slug) {
          return res.status(400).json({
            error: "Paramenter 'slug' wajib diisi untuk action 'franchise'."
          });
        }
        response = await api.franchiseVideos(params);
        break;
      case "streams":
        if (!params.slug) {
          return res.status(400).json({
            error: "Paramenter 'slug' wajib diisi untuk action 'streams'."
          });
        }
        response = await api.getVideoStreams(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "browse":
        response = await api.browse(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: ${validActions.join(", ")}.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}