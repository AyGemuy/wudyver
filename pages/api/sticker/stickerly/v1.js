import axios from "axios";
class StickerLy {
  constructor() {
    this.base = "http://api.sticker.ly/v4";
    this.headers = {
      "User-Agent": "androidapp.stickerly/2.16.0 (G011A; U; Android 22; pt-BR; br;)",
      "Content-Type": "application/json"
    };
  }
  async req(method, path, payload = {}) {
    console.log(`[REQ] ${method} ${path}`);
    try {
      const is_get = method === "GET";
      const conf = {
        method: method,
        url: `${this.base}${path}`,
        headers: this.headers,
        params: is_get ? payload : undefined,
        data: !is_get ? payload : undefined
      };
      const {
        data
      } = await axios(conf);
      console.log(`[LOG] Status: ${data?.meta?.status || 200}`);
      return data?.result || data;
    } catch (e) {
      const msg = e?.response?.data?.meta?.message || e?.message;
      console.error(`[ERR] ${msg || "Unknown Error"}`);
      return {
        error: true,
        msg: msg
      };
    }
  }
  async sticker_recommend() {
    return await this.req("GET", "/sticker/recommend");
  }
  async sticker_search({
    ...rest
  }) {
    const body = {
      keyword: "",
      size: 10,
      cursor: 1,
      limit: 99,
      ...rest
    };
    return await this.req("POST", "/sticker/searchV2", body);
  }
  async sticker_related({
    sid,
    ...rest
  }) {
    if (!sid) return {
      error: true,
      msg: "sid required"
    };
    return await this.req("GET", "/sticker/related", {
      sid: sid,
      ...rest
    });
  }
  async pack_detail({
    id
  }) {
    if (!id) return {
      error: true,
      msg: "id required"
    };
    return await this.req("GET", `/stickerPack/${id}`);
  }
  async pack_search({
    ...rest
  }) {
    const body = {
      keyword: "",
      size: 10,
      cursor: 1,
      limit: 20,
      ...rest
    };
    return await this.req("POST", "/stickerPack/searchV2", body);
  }
  async pack_recommend() {
    return await this.req("GET", "/stickerPack/recommend");
  }
  async pack_related({
    id
  }) {
    if (!id) return {
      error: true,
      msg: "id required"
    };
    return await this.req("GET", `/stickerPack/${id}/recommendedCategories`);
  }
  async home() {
    return await this.req("GET", "/hometab/overview");
  }
  async tab_packs({
    id,
    ...rest
  }) {
    return await this.req("GET", `/hometab/${id}/packs`, rest);
  }
  async tab_stickers({
    id,
    ...rest
  }) {
    return await this.req("GET", `/hometab/${id}/stickers`, rest);
  }
  async trending({
    ...rest
  }) {
    return await this.req("POST", "/trending/search", rest);
  }
  async artist_recommend({
    ...rest
  }) {
    return await this.req("POST", "/artist/recommend", rest);
  }
  async tag_search({
    ...rest
  }) {
    const body = {
      keyword: "",
      size: 10,
      cursor: 1,
      limit: 99,
      ...rest
    };
    return await this.req("POST", "/stickerTag/search", body);
  }
  async tag_recommend() {
    return await this.req("GET", "/sticker/tag/recommend");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "sticker_search", "sticker_recommend", "sticker_related", "pack_search", "pack_detail", "pack_recommend", "pack_related", "tab_packs", "tab_stickers", "trending", "artist_recommend", "tag_search", "tag_recommend"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: validActions
    });
  }
  const api = new StickerLy();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "sticker_search":
        if (!params.keyword) {
          return res.status(400).json({
            error: "Parameter 'keyword' wajib diisi."
          });
        }
        response = await api.sticker_search(params);
        break;
      case "sticker_recommend":
        response = await api.sticker_recommend();
        break;
      case "sticker_related":
        if (!params.sid) {
          return res.status(400).json({
            error: "Parameter 'sid' wajib diisi."
          });
        }
        response = await api.sticker_related(params);
        break;
      case "pack_search":
        if (!params.keyword) {
          return res.status(400).json({
            error: "Parameter 'keyword' wajib diisi."
          });
        }
        response = await api.pack_search(params);
        break;
      case "pack_detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' (Pack Code) wajib diisi."
          });
        }
        response = await api.pack_detail(params);
        break;
      case "pack_recommend":
        response = await api.pack_recommend();
        break;
      case "pack_related":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi."
          });
        }
        response = await api.pack_related(params);
        break;
      case "tab_packs":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' (Tab ID) wajib diisi."
          });
        }
        response = await api.tab_packs(params);
        break;
      case "tab_stickers":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' (Tab ID) wajib diisi."
          });
        }
        response = await api.tab_stickers(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "artist_recommend":
        response = await api.artist_recommend(params);
        break;
      case "tag_search":
        if (!params.keyword) {
          return res.status(400).json({
            error: "Parameter 'keyword' wajib diisi."
          });
        }
        response = await api.tag_search(params);
        break;
      case "tag_recommend":
        response = await api.tag_recommend();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}