import axios from "axios";
class MusicAPI {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://code.zhangdong.site",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://code.zhangdong.site/music/#/search"
      }
    });
  }
  async searchMusic(keywords = "Hello", type = 1e3, limit = 6) {
    try {
      const response = await this.axiosInstance.get("/api/search", {
        params: {
          keywords: keywords,
          type: type,
          limit: limit
        }
      });
      return response.data || [];
    } catch (error) {
      return [];
    }
  }
  async getSongDetails(ids = [], timestamp = Date.now()) {
    try {
      const idsArray = Array.isArray(ids) ? ids : typeof ids === "string" ? ids.split(",").map(id => id.trim()) : [ids];
      const response = await this.axiosInstance.get(`/api/song/detail?ids=${idsArray.join(",")}&timestamp=${timestamp}`);
      return response.data || {};
    } catch (error) {
      return {};
    }
  }
  async getSongURL(id = 35847388, bitrate = 128e3) {
    try {
      const response = await this.axiosInstance.get("/api/song/url", {
        params: {
          id: id,
          br: bitrate
        }
      });
      return response.data || {};
    } catch (error) {
      return {};
    }
  }
}
export default async function handler(req, res) {
  const {
    action = "search",
      keywords,
      type,
      limit,
      timestamp,
      id,
      bitrate
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    const musicAPI = new MusicAPI();
    switch (action) {
      case "search":
        result = await musicAPI.searchMusic(keywords || "Hello", type || 1e3, limit || 6);
        break;
      case "detail":
        result = await musicAPI.getSongDetails(id || [], timestamp || Date.now());
        break;
      case "url":
        result = await musicAPI.getSongURL(id || 35847388, bitrate || 128e3);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}