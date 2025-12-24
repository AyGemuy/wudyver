import axios from "axios";
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: "http://13.233.20.169:3000/api",
      timeout: 3e3,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Dart/3.8 (dart:io)",
        "Accept-Encoding": "gzip"
      }
    });
  }
  async _req({
    method,
    url,
    params = {}
  }) {
    const start = Date.now();
    console.log(`[PROCESS] ${method.toUpperCase()} ${url} | Params: ${JSON.stringify(params)}`);
    try {
      const res = await this.client.request({
        method: method,
        url: url,
        params: params
      });
      const duration = Date.now() - start;
      console.log(`[SUCCESS] Status: ${res.status} | Time: ${duration}ms`);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error(`[ERROR] Failed to fetch ${url} | ${msg}`);
      return null;
    }
  }
  async cats() {
    console.log("API: Fetching categories");
    const raw = await this._req({
      method: "get",
      url: "/categories"
    });
    const isSuccess = raw?.success ?? false;
    if (!isSuccess) {
      console.warn("[API] Categories response not success");
      return [];
    }
    const list = raw?.categories || [];
    return list.map(item => ({
      id: item?.id || 0,
      name: item?.name || "",
      slug: item?.slug || "",
      url: item?.url || "",
      image: item?.image || ""
    }));
  }
  async vids({
    slug,
    page = 1
  }) {
    const categorySlug = slug;
    console.log(`API: Fetching videos for ${categorySlug}, page ${page}`);
    const raw = await this._req({
      method: "get",
      url: `/category/${categorySlug}/videos`,
      params: {
        page: page
      }
    });
    const isSuccess = raw?.success || false;
    if (!isSuccess) return {
      videos: [],
      hasNext: false
    };
    const videos = (raw?.videos || []).map(v => {
      const meta = v?.metadata || {};
      return {
        id: v?.id || 0,
        title: v?.title || "",
        thumbnail: v?.thumbnail || "",
        videoUrl: v?.videoUrl || "",
        detailsUrl: v?.detailsUrl || "",
        downloadUrl: v?.downloadUrl || "",
        slug: v?.slug || "",
        metadata: {
          fileSize: meta?.fileSize || "",
          views: meta?.views || "0",
          duration: meta?.duration || "00:00"
        }
      };
    });
    return {
      page: raw?.page || 1,
      totalPages: raw?.totalPages || 0,
      hasNextPage: raw?.hasNextPage ?? false,
      videos: videos
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new ApiService();
  try {
    let response;
    switch (action) {
      case "vids":
        if (!params.slug) {
          return res.status(400).json({
            error: "Parameter 'slug' wajib diisi untuk action 'vids'."
          });
        }
        response = await api.vids(params);
        break;
      case "cats":
        response = await api.cats();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'vids', 'cats'.`
        });
    }
    return res.status(200).json({
      success: true,
      result: response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}