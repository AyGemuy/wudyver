import axios from "axios";
class DeviantArt {
  constructor(config = {}) {
    this.base = "https://www.deviantart.com/_puppy";
    this.csrf = config?.csrf || null;
    this.cookies = config?.cookies || "";
    this.client = axios.create({
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...config?.headers || {}
      }
    });
  }
  async init() {
    console.log("[Init] Getting cookies & CSRF token...");
    try {
      const res = await this.client.get("https://www.deviantart.com");
      const setCookie = res?.headers?.["set-cookie"] || [];
      const cookies = [];
      for (const cookie of setCookie) {
        const match = cookie?.match(/^([^=]+)=([^;]+)/);
        if (match) cookies.push(`${match[1]}=${match[2]}`);
      }
      this.cookies = cookies.join("; ");
      console.log("[Init] Cookies set:", this.cookies ? "✓" : "✗");
      const html = res?.data || "";
      const csrfMatch = html?.match(/window\.__CSRF_TOKEN__\s*=\s*['"]([^'"]+)['"]/);
      this.csrf = csrfMatch?.[1] || "";
      console.log("[Init] CSRF token obtained:", this.csrf ? "✓" : "✗");
      if (this.cookies) {
        this.client.defaults.headers.cookie = this.cookies;
      }
      return {
        csrf: this.csrf,
        cookies: this.cookies
      };
    } catch (err) {
      console.error("[Init] Error:", err?.message || err);
      throw err;
    }
  }
  async search({
    query,
    detail = true,
    limit = 5,
    cursor = "",
    ...rest
  }) {
    console.log(`[Search] Query: ${query}, Detail: ${detail}, Limit: ${limit}`);
    if (!this.csrf) {
      try {
        await this.init();
      } catch (err) {
        console.error("[Search] Init failed:", err?.message || err);
        throw err;
      }
    }
    try {
      const url = `${this.base}/dabrowse/search/all`;
      const params = {
        q: query,
        cursor: cursor || undefined,
        da_minor_version: "20230710",
        csrf_token: this.csrf,
        ...rest
      };
      console.log("[Search] Fetching...");
      const {
        data
      } = await this.client.get(url, {
        params: params
      });
      const items = data?.deviations || [];
      const result = {
        total: data?.estTotal || 0,
        hasMore: data?.hasMore || false,
        nextCursor: data?.nextCursor || null,
        prevCursor: data?.prevCursor || null,
        items: []
      };
      const max = Math.min(limit, items?.length || 0);
      console.log(`[Search] Processing ${max} items...`);
      for (const item of items.slice(0, max)) {
        try {
          if (detail) {
            console.log(`[Search] Fetching detail for: ${item?.title || "Unknown"}`);
            const detailData = await this.detail({
              url: item?.url,
              ...rest
            });
            result.items.push({
              ...item,
              ...detailData
            });
          } else {
            result.items.push(item);
          }
        } catch (err) {
          console.error(`[Search] Item error (${item?.title || "Unknown"}):`, err?.message || err);
          result.items.push(item);
        }
      }
      console.log(`[Search] Completed: ${result.items.length} items`);
      return result;
    } catch (err) {
      console.error("[Search] Error:", err?.message || err);
      throw err;
    }
  }
  async detail({
    url,
    ...rest
  }) {
    console.log(`[Detail] URL: ${url}`);
    if (!this.csrf) {
      try {
        await this.init();
      } catch (err) {
        console.error("[Detail] Init failed:", err?.message || err);
        throw err;
      }
    }
    try {
      const match = url?.match(/\/([^\/]+)\/art\/[^\/]+-(\d+)\/?$/) || url?.match(/\/art\/[^\/]+-(\d+)\/?$/) || url?.match(/art-(\d+)$/);
      const username = match?.[1] && !match[1]?.match(/^\d+$/) ? match[1] : "";
      const id = username ? match?.[2] : match?.[1] || "";
      if (!id) {
        throw new Error("Invalid URL format");
      }
      const endpoint = `${this.base}/dadeviation/init`;
      const params = {
        deviationid: id,
        username: username,
        type: "art",
        include_session: false,
        csrf_token: this.csrf,
        expand: "deviation.related",
        preload: true,
        da_minor_version: "20230710",
        ...rest
      };
      console.log("[Detail] Fetching...");
      const {
        data
      } = await this.client.get(endpoint, {
        params: params
      });
      console.log("[Detail] Completed");
      return data?.deviation || {};
    } catch (err) {
      console.error("[Detail] Error:", err?.message || err);
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
      error: "Parameter 'action' wajib diisi",
      actions: ["search", "detail"]
    });
  }
  const api = new DeviantArt();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'"
          });
        }
        result = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'detail'",
            example: "https://www.deviantart.com/username/art/Title-123456"
          });
        }
        result = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["search", "detail"]
        });
    }
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message || e);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}