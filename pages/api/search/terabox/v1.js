import axios from "axios";
class TeraboxSearch {
  constructor(config = {}) {
    this.base = config.base || "https://teraboxsearch.xyz/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://teraboxsearch.xyz",
      "user-agent": config.ua || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...config.headers
    };
    this.http = axios.create({
      baseURL: this.base,
      headers: this.headers,
      timeout: config.timeout || 3e4
    });
  }
  async search({
    query,
    limit = 5,
    detail = true,
    ...rest
  }) {
    console.log(`[search] query: ${query}, limit: ${limit}, detail: ${detail}`);
    try {
      const {
        data
      } = await this.http.post("/search", {
        query: query,
        ...rest
      });
      const raw = data?.data?.content || [];
      console.log(`[search] found ${raw.length} channels`);
      const items = raw.slice(0, limit);
      const results = [];
      for (const item of items) {
        const ch = item?.channel || {};
        const res = item?.results?.[0] || {};
        const parsed = {
          title: res.title || "N/A",
          url: res.url || "",
          preview: res.preview || "",
          files: res.file_num || 0,
          channel: {
            id: ch.channel_id || "",
            name: ch.channel_name || "Unknown",
            groupId: ch.group_id || "",
            avatar: ch.head_url || ""
          }
        };
        if (detail && ch.channel_id) {
          console.log(`[search] fetching detail for channel: ${ch.channel_id}`);
          const detailData = await this.detail({
            id: ch.channel_id
          });
          parsed.detail = detailData || null;
        }
        results.push(parsed);
      }
      console.log(`[search] returning ${results.length} results`);
      return {
        ok: true,
        count: results.length,
        items: results
      };
    } catch (e) {
      console.error(`[search] error: ${e?.message || e}`);
      return {
        ok: false,
        error: e?.message || "Unknown error",
        items: []
      };
    }
  }
  async detail({
    id,
    lastPostTime = 0,
    ...rest
  }) {
    console.log(`[detail] id: ${id}, lastPostTime: ${lastPostTime}`);
    try {
      const {
        data
      } = await this.http.post("/channel-info", {
        buk: id,
        lastPostTime: lastPostTime,
        ...rest
      });
      const raw = data?.data?.content || [];
      console.log(`[detail] found ${raw.length} posts`);
      const posts = raw.map(item => {
        const ch = item?.channel || {};
        const res = item?.results?.[0] || {};
        return {
          title: res.title || "N/A",
          url: res.url || "",
          preview: res.preview || "",
          files: res.file_num || 0,
          created: item.create_time || 0,
          channel: {
            id: ch.channel_id || "",
            name: ch.channel_name || "Unknown",
            groupId: ch.group_id || "",
            avatar: ch.head_url || ""
          }
        };
      });
      console.log(`[detail] returning ${posts.length} posts`);
      return {
        ok: true,
        count: posts.length,
        posts: posts
      };
    } catch (e) {
      console.error(`[detail] error: ${e?.message || e}`);
      return {
        ok: false,
        error: e?.message || "Unknown error",
        posts: []
      };
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
      tip: "Gunakan action=search atau action=detail",
      example: {
        search: "?action=search&query=anime&limit=5&detail=true",
        detail: "?action=detail&id=4402320787247&lastPostTime=0"
      }
    });
  }
  const api = new TeraboxSearch();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          console.log(`[AUTO] 'query' kosong pada action 'search'.`);
          return res.status(400).json({
            error: "Parameter 'query' wajib untuk search.",
            tip: "Gunakan action=search&query=keyword untuk mencari.",
            example: "?action=search&query=anime&limit=5&detail=true",
            params: {
              query: "string (required) - Kata kunci pencarian",
              limit: "number (optional, default: 5) - Jumlah hasil",
              detail: "boolean (optional, default: true) - Ambil detail channel"
            }
          });
        }
        response = await api.search({
          query: params.query,
          limit: params.limit ? parseInt(params.limit) : 5,
          detail: params.detail !== "false" && params.detail !== false
        });
        break;
      case "detail":
        if (!params.id) {
          console.log(`[AUTO] 'id' kosong pada action 'detail'.`);
          return res.status(400).json({
            error: "Parameter 'id' wajib untuk detail.",
            tip: "Gunakan action=detail&id=channel_id untuk melihat detail channel.",
            example: "?action=detail&id=4402320787247&lastPostTime=0",
            params: {
              id: "string (required) - Channel ID",
              lastPostTime: "number (optional, default: 0) - Timestamp untuk pagination"
            }
          });
        }
        response = await api.detail({
          id: params.id,
          lastPostTime: params.lastPostTime ? parseInt(params.lastPostTime) : 0
        });
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: search, detail`,
          supported: ["search", "detail"],
          examples: {
            search: "?action=search&query=anime&limit=5&detail=true",
            detail: "?action=detail&id=4402320787247"
          }
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal.",
      action: action,
      params: params
    });
  }
}