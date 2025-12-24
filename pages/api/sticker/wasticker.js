import axios from "axios";
class ApiClient {
  constructor(cfg = {}) {
    this.CFG = {
      BASE: "https://api.sebastianspross.de/2024-09-02/diffusion",
      KEY: "AIzaSyDf9_cRKOFkb0mP49YY7X1Qugz85GK1hic",
      APP: "1:460072437974:android:480d0ab8b9ca171552a177",
      TYPES: ["img_sas_original", "img_sas_wasticker", "img_sas_wasticker_rembg"],
      FMT: {
        original: 0,
        wasticker: 1,
        rembg: 2
      }
    };
    this.ax = axios.create({
      baseURL: cfg.base || this.CFG.BASE,
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.token = null;
    this.loginProm = null;
    this.ax.interceptors.request.use(async c => {
      if (!c.headers.Authorization && !c.skipAuth) {
        const t = await this.ensureAuth();
        if (t) c.headers.Authorization = `Bearer ${t}`;
      }
      return c;
    });
  }
  _ok(d) {
    return {
      success: true,
      data: d
    };
  }
  _err(m, c = "ERR") {
    return {
      success: false,
      error: m,
      code: c
    };
  }
  async ensureAuth() {
    if (this.token) return this.token;
    if (this.loginProm) return this.loginProm;
    console.log("[AUTH] Login guest...");
    this.loginProm = (async () => {
      try {
        const {
          data
        } = await axios.post("https://identitytoolkit.googleapis.com/v1/accounts:signUp", {
          appId: this.CFG.APP,
          returnSecureToken: true
        }, {
          params: {
            key: this.CFG.KEY
          }
        });
        console.log("[AUTH] Raw:", JSON.stringify(data, null, 2).substring(0, 300));
        this.token = data?.idToken || null;
        console.log("[AUTH] Success");
        return this.token;
      } catch (e) {
        const err = e?.response?.data?.error?.message || e.message;
        console.error("[AUTH] Failed:", err);
        return null;
      } finally {
        this.loginProm = null;
      }
    })();
    return this.loginProm;
  }
  async _enrich(items, fmt = "original") {
    try {
      const res = [];
      const idx = this.CFG.FMT[fmt] ?? 0;
      const img_type = this.CFG.TYPES[idx];
      for (const item of items) {
        try {
          let sas_url = item?.[img_type] || item?.[this.CFG.TYPES[0]] || item?.[this.CFG.TYPES[1]] || item?.[this.CFG.TYPES[2]];
          if (!sas_url && item.img_id) {
            console.log(`[ENRICH] Fetch SAS for ${item.img_id}...`);
            const dl = await this.download({
              img_id: item.img_id,
              img_type: img_type
            });
            sas_url = dl.success ? dl.data.sas_url : null;
          }
          console.log(`[SAS] ${item.img_id?.substring(0, 8)} → ${sas_url ? sas_url.substring(0, 50) + "..." : "null"}`);
          res.push({
            ...item,
            sas_url: sas_url
          });
        } catch (e) {
          console.error(`[ENRICH] Skip item ${item.img_id}:`, e.message);
          res.push({
            ...item,
            sas_url: null
          });
        }
      }
      console.log(`[ENRICH] Success ${res.length} items`);
      return this._ok(res);
    } catch (e) {
      console.error("[ENRICH] Error:", e.message);
      return this._err("Enrich failed", "ENRICH_FAIL");
    }
  }
  async search({
    query,
    style = "flux",
    limit = 5,
    format = "original",
    ...r
  } = {}) {
    if (!query) return this._err("Query required", "NO_QUERY");
    try {
      console.log(`[SEARCH] "${query}" | fmt: ${format}`);
      const {
        data
      } = await this.ax.get("/images/search", {
        params: {
          style: style,
          query: query,
          limit: limit,
          ...r
        }
      });
      console.log("[SEARCH] Raw:", JSON.stringify(data, null, 2).substring(0, 500));
      if (!Array.isArray(data) || data.length === 0) {
        console.log("[SEARCH] Empty result");
        return this._ok([]);
      }
      const enriched = await this._enrich(data, format);
      if (!enriched.success) return enriched;
      console.log(`[SEARCH] Done ${enriched.data.length} items`);
      return enriched;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      console.error("[SEARCH] Failed:", msg);
      return this._err(msg, "SEARCH_FAIL");
    }
  }
  async latest({
    offset = 0,
    limit = 5,
    format = "original",
    ...r
  } = {}) {
    try {
      console.log(`[LATEST] offset=${offset} | limit=${limit} | fmt: ${format}`);
      const {
        data
      } = await this.ax.get("/images/list/latest", {
        params: {
          offset: offset,
          limit: limit,
          ...r
        }
      });
      console.log("[LATEST] Raw:", JSON.stringify(data, null, 2).substring(0, 500));
      if (!Array.isArray(data) || data.length === 0) {
        console.log("[LATEST] Empty result");
        return this._ok([]);
      }
      const enriched = await this._enrich(data, format);
      if (!enriched.success) return enriched;
      console.log(`[LATEST] Done ${enriched.data.length} items`);
      return enriched;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      console.error("[LATEST] Failed:", msg);
      return this._err(msg, "LATEST_FAIL");
    }
  }
  async download({
    img_id,
    img_type
  }) {
    if (!img_id || !img_type) return this._err("Missing params", "NO_PARAMS");
    if (!this.CFG.TYPES.includes(img_type)) {
      return this._err(`Invalid img_type: "${img_type}". Must be: ${this.CFG.TYPES.map(t => `"${t}"`).join(", ")}`, "BAD_TYPE");
    }
    try {
      console.log(`[DOWNLOAD] Request → ${img_id} | ${img_type}`);
      const {
        data
      } = await this.ax.get("/image/sas", {
        params: {
          img_id: img_id,
          img_type: img_type
        }
      });
      console.log("[DOWNLOAD] Raw:", JSON.stringify(data, null, 2));
      const url = data?.[img_type];
      if (url) {
        console.log("[DOWNLOAD] Success:", url.substring(0, 60) + "...");
        return this._ok({
          sas_url: url
        });
      } else {
        console.warn("[DOWNLOAD] No URL in response");
        return this._ok({
          sas_url: null
        });
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      console.error("[DOWNLOAD] Failed:", msg);
      return this._err(msg, "DL_FAIL");
    }
  }
  async style_list({
    style = "flux",
    offset = 0,
    limit = 5,
    ...r
  } = {}) {
    try {
      console.log(`[STYLE_IMG] style=${style} | offset=${offset} | limit=${limit}`);
      const {
        data
      } = await this.ax.get("/images/list/style", {
        params: {
          style: style,
          offset: offset,
          limit: limit,
          ...r
        }
      });
      console.log("[STYLE_IMG] Raw:", JSON.stringify(data, null, 2).substring(0, 500));
      console.log(`[STYLE_IMG] Success ${Array.isArray(data) ? data.length : 0} items`);
      return this._ok(data);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      console.error("[STYLE_IMG] Failed:", msg);
      return this._err(msg, "STYLE_FAIL");
    }
  }
  async styles() {
    try {
      console.log("[STYLES] Fetching...");
      const {
        data
      } = await this.ax.get("/styles");
      console.log("[STYLES] Raw:", JSON.stringify(data, null, 2));
      console.log("[STYLES] Success");
      return this._ok(data);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      console.error("[STYLES] Failed:", msg);
      return this._err(msg, "STYLES_FAIL");
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
      actions: ["search", "latest", "download", "style_list", "styles"]
    });
  }
  const api = new ApiClient();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib untuk action 'search'.",
            example: "action=search&query=cat&style=flux&limit=5&format=original"
          });
        }
        console.log("[ACTION] Searching:", params.query);
        response = await api.search(params);
        break;
      case "latest":
        console.log("[ACTION] Getting latest images");
        response = await api.latest(params);
        break;
      case "download":
        if (!params.img_id || !params.img_type) {
          return res.status(400).json({
            error: "Parameter 'img_id' dan 'img_type' wajib untuk action 'download'.",
            example: "action=download&img_id=xxx&img_type=img_sas_wasticker",
            valid_types: ["img_sas_original", "img_sas_wasticker", "img_sas_wasticker_rembg"]
          });
        }
        console.log("[ACTION] Downloading:", params.img_id);
        response = await api.download(params);
        break;
      case "style_list":
        console.log("[ACTION] Getting style images:", params.style || "flux");
        response = await api.style_list(params);
        break;
      case "styles":
        console.log("[ACTION] Getting available styles");
        response = await api.styles();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supported: ["search", "latest", "download", "style_list", "styles"],
          examples: {
            search: "?action=search&query=cat&style=flux&limit=5&format=wasticker",
            latest: "?action=latest&offset=0&limit=10&format=original",
            download: "?action=download&img_id=xxx&img_type=img_sas_wasticker",
            style_list: "?action=style_list&style=flux&offset=0&limit=5",
            styles: "?action=styles"
          },
          parameters: {
            format: ["original", "wasticker", "rembg"],
            style: "flux | sticker | realistic | anime | ...",
            img_type: ["img_sas_original", "img_sas_wasticker", "img_sas_wasticker_rembg"]
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