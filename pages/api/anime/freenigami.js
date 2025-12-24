import axios from "axios";
class MangaAPI {
  constructor() {
    this.baseUrl = "https://freenigami.vercel.app/v1/api";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      "Accept-Encoding": "gzip, deflate, br",
      Accept: "application/json"
    };
  }
  async search({
    query,
    pageSize = 20,
    page = 1,
    sort = "latest",
    sortOrder = "desc",
    format = "manhwa",
    ...rest
  }) {
    if (!query) throw new Error("Query pencarian (q) wajib ada.");
    const url = new URL(`${this.baseUrl}/mangas`);
    url.searchParams.append("q", query);
    url.searchParams.append("page_size", pageSize);
    url.searchParams.append("page", page);
    url.searchParams.append("sort", sort);
    url.searchParams.append("sort_order", sortOrder);
    url.searchParams.append("format", format);
    for (const key in rest) url.searchParams.append(key, rest[key]);
    try {
      const response = await axios.get(url.toString(), {
        headers: {
          ...this.headers,
          Referer: "https://freenigami.vercel.app/"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mencari manga:", error.message);
      return null;
    }
  }
  async detail({
    mangaId,
    pageSize = 100,
    sortOrder = "desc",
    page = 1,
    ...rest
  }) {
    if (!mangaId) throw new Error("Manga ID wajib ada.");
    const url = new URL(`${this.baseUrl}/mangas/${mangaId}/chapters`);
    url.searchParams.append("page_size", pageSize);
    url.searchParams.append("page", page);
    url.searchParams.append("sort_order", sortOrder);
    for (const key in rest) url.searchParams.append(key, rest[key]);
    try {
      const response = await axios.get(url.toString(), {
        headers: {
          ...this.headers,
          Referer: `https://freenigami.vercel.app/read/${mangaId}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Terjadi kesalahan saat mengambil chapter untuk manga ID ${mangaId}:`, error.message);
      return null;
    }
  }
  async download({
    mangaId,
    chapterId,
    ...rest
  }) {
    if (!mangaId) throw new Error("Manga ID wajib ada.");
    if (!chapterId) throw new Error("Chapter ID wajib ada.");
    const url = new URL(`${this.baseUrl}/mangas/${mangaId}/chapters/${chapterId}`);
    for (const key in rest) url.searchParams.append(key, rest[key]);
    try {
      const response = await axios.get(url.toString(), {
        headers: {
          ...this.headers,
          Referer: `https://freenigami.vercel.app/read/${mangaId}/${chapterId}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Terjadi kesalahan saat mengambil halaman chapter ${chapterId} untuk manga ${mangaId}:`, error.message);
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
      error: 'Paramenter "action" wajib ada.',
      required: {
        action: "search | detail | download"
      }
    });
  }
  const mangaApi = new MangaAPI();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Paramenter "query" wajib ada untuk aksi "${action}".`
          });
        }
        result = await mangaApi.search(params);
        break;
      case "detail":
        if (!params.mangaId) {
          return res.status(400).json({
            error: `Paramenter "mangaId" wajib ada untuk aksi "${action}".`
          });
        }
        result = await mangaApi.detail(params);
        break;
      case "download":
        if (!params.mangaId || !params.chapterId) {
          return res.status(400).json({
            error: `Paramenter "mangaId" dan "chapterId" wajib ada untuk aksi "${action}".`
          });
        }
        result = await mangaApi.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Aksi tidak valid: "${action}". Aksi yang diizinkan: "search", "detail", "download".`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(500).json({
      error: `Terjadi kesalahan internal server: ${error.message}`
    });
  }
}