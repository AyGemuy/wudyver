import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class VlipsyAPI {
  constructor(options = {}) {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://vlipsy.com",
      headers: {
        "accept-language": "id-ID",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...options?.headers
      },
      jar: this.jar,
      withCredentials: true
    }));
    this.log = options?.logger || console;
  }
  async req(config) {
    const start = Date.now();
    try {
      this.log.log(`🚀 ${config?.method?.toUpperCase() || "GET"} ${config?.url}`);
      const res = await this.client.request({
        ...config,
        headers: {
          accept: config?.isCategory ? "*/*" : "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          origin: "https://vlipsy.com",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          ...config?.isSearch && {
            "next-action": "7857b57199915e4b45aa20cadc4ad31c0e7f1c5ef1",
            "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(home)%22%2C%7B%22modal%22%3A%5B%22__PAGE__%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%2C%22children%22%3A%5B%22search%22%2C%7B%22children%22%3A%5B%5B%22term%22%2C%22dr%22%2C%22c%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
            referer: `https://vlipsy.com/search/${encodeURIComponent(config?.query || "")}`
          },
          ...config?.isCategory && {
            "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(home)%22%2C%7B%22modal%22%3A%5B%22__PAGE__%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%2C%22children%22%3A%5B%22category%22%2C%7B%22children%22%3A%5B%5B%22slug%22%2C%22memes%22%2C%22c%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
            "next-url": `/category/${config?.category || "memes"}`,
            referer: `https://vlipsy.com/category/${config?.category || "memes"}`,
            rsc: "1"
          },
          ...config?.isDetail && {
            "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(home)%22%2C%7B%22modal%22%3A%5B%22__PAGE__%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%2C%22children%22%3A%5B%22category%22%2C%7B%22children%22%3A%5B%5B%22slug%22%2C%22christmas%22%2C%22c%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
            "next-url": "/category/christmas",
            referer: "https://vlipsy.com/category/christmas",
            rsc: "1"
          },
          ...config?.headers
        }
      });
      const time = Date.now() - start;
      this.log.log(`✅ ${res?.status} ${config?.url} (${time}ms)`);
      return res;
    } catch (error) {
      this.log.error(`❌ Error ${config?.url}:`, error?.message);
      throw error;
    }
  }
  parse(raw) {
    try {
      this.log.log("🔧 Parsing response...");
      if (typeof raw === "object" && raw !== null) {
        return this.extract(raw);
      }
      if (typeof raw !== "string") return {};
      const result = {};
      const lines = raw.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || "";
        if (line.includes('"data"') || line.includes('"clip"') || line.includes('"initialData"')) {
          const start = line.indexOf("{");
          const end = line.lastIndexOf("}");
          if (start !== -1 && end !== -1 && end > start) {
            try {
              const json = line.substring(start, end + 1);
              const parsed = JSON.parse(json);
              const extracted = this.extract(parsed);
              if (extracted?.data || extracted?.clip) {
                Object.assign(result, extracted);
              }
            } catch (e) {}
          }
        }
      }
      if (result?.data || result?.clip) {
        return result;
      }
      try {
        const parsed = JSON.parse(raw);
        return this.extract(parsed);
      } catch (e) {
        return {};
      }
    } catch (error) {
      this.log.warn("⚠️ Parse warning:", error?.message);
      return {};
    }
  }
  extract(obj) {
    const result = {};
    const clips = [];
    const find = (current, key) => {
      const found = [];
      const search = node => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(item => search(item));
        } else {
          if (node?.[key] !== undefined) {
            found.push(node[key]);
          }
          for (const k in node) {
            if (node?.hasOwnProperty?.(k) && node?.[k] && typeof node[k] === "object") {
              search(node[k]);
            }
          }
        }
      };
      search(current);
      return found;
    };
    const allData = find(obj, "data");
    const allClips = find(obj, "clip");
    for (const item of allData) {
      if (Array.isArray(item)) {
        item.forEach(clip => {
          if (clip && typeof clip === "object") {
            clips.push(this.simplify(clip));
          }
        });
      }
    }
    for (const item of allClips) {
      if (item && typeof item === "object") {
        clips.push(this.simplify(item));
      }
    }
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (item && typeof item === "object" && item?.id) {
          clips.push(this.simplify(item));
        }
      });
    } else if (obj?.id && obj?.duration) {
      clips.push(this.simplify(obj));
    }
    const unique = [];
    const ids = new Set();
    for (const clip of clips) {
      if (clip?.id && !ids.has(clip.id)) {
        ids.add(clip.id);
        unique.push(clip);
      }
    }
    if (unique.length > 0) {
      result.data = unique;
    }
    if (obj?.pagination) result.pagination = obj.pagination;
    if (obj?.metadata) result.metadata = obj.metadata;
    if (obj?.related_tags) result.related_tags = obj.related_tags;
    return result;
  }
  simplify(clip) {
    if (!clip || typeof clip !== "object") return null;
    return {
      id: clip?.id || "",
      duration: clip?.duration || 0,
      slug: clip?.slug || "",
      ...clip?.metadata,
      ...clip?.media,
      created: clip?.status?.created || "",
      urls: {
        embed: clip?.urls?.embed || (clip?.id ? `https://vlipsy.com/embed/${clip.id}` : ""),
        detail: clip?.urls?.detail || (clip?.slug ? `https://vlipsy.com/clips/${clip.slug}` : "")
      }
    };
  }
  async search({
    query,
    limit = 5,
    detail = true,
    ...rest
  }) {
    try {
      this.log.log(`🔍 Searching: "${query}"`);
      const res = await this.req({
        method: "POST",
        url: `/search/${encodeURIComponent(query)}`,
        data: JSON.stringify([query, false, 40, 20]),
        isSearch: true,
        query: query,
        ...rest
      });
      const parsed = this.parse(res?.data);
      let data = parsed?.data || [];
      if (limit && limit > 0) {
        data = data.slice(0, limit);
      }
      if (detail && data.length > 0) {
        this.log.log(`📥 Getting details for ${data.length} clips`);
        const detailed = [];
        for (const clip of data) {
          try {
            const detailRes = await this.detail({
              url: clip?.slug
            });
            detailed.push(detailRes?.success && detailRes?.clip ? detailRes.clip : clip);
          } catch (err) {
            detailed.push(clip);
          }
        }
        data = detailed;
      }
      return {
        success: true,
        query: query,
        count: data.length,
        data: data,
        ...parsed?.pagination && {
          pagination: parsed.pagination
        }
      };
    } catch (error) {
      this.log.error("❌ Search error:", error?.message);
      return {
        success: false,
        error: error?.message,
        data: []
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    try {
      const clipSlug = url?.split("/")?.pop() || url;
      this.log.log(`📄 Getting detail: ${clipSlug}`);
      const res = await this.req({
        method: "GET",
        url: `/clips/${clipSlug}`,
        isDetail: true,
        ...rest
      });
      const parsed = this.parse(res?.data);
      const clip = parsed?.data?.[0] || null;
      if (!clip) {
        throw new Error("Clip not found");
      }
      return {
        success: true,
        clip: clip
      };
    } catch (error) {
      this.log.error("❌ Detail error:", error?.message);
      return {
        success: false,
        error: error?.message,
        clip: null
      };
    }
  }
  async category({
    name = "popular",
    limit = 20,
    ...rest
  }) {
    try {
      this.log.log(`🏷️ Getting category: ${name}`);
      const res = await this.req({
        method: "GET",
        url: `/category/${name}?_rsc=1krif`,
        isCategory: true,
        category: name,
        ...rest
      });
      const parsed = this.parse(res?.data);
      let data = parsed?.data || [];
      if (limit && limit > 0) {
        data = data.slice(0, limit);
      }
      return {
        success: true,
        category: name,
        count: data.length,
        data: data,
        ...parsed?.pagination && {
          pagination: parsed.pagination
        }
      };
    } catch (error) {
      this.log.error("❌ Category error:", error?.message);
      return {
        success: false,
        error: error?.message,
        data: []
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new VlipsyAPI();
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
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "category":
        if (!params.name) {
          return res.status(400).json({
            error: "Paramenter 'name' wajib diisi untuk action 'category'."
          });
        }
        response = await api.category(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'detail', 'category'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}