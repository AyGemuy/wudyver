import axios from "axios";
import * as cheerio from "cheerio";
class UChord {
  constructor() {
    this.base = "https://uchord-api.idayrus.com";
    this.headers = {
      "User-Agent": "uChordClient (Linux; Android 15; Realme RMX3890; API 35) uChord/1.02.032",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "X-Gerbang": "androidClient",
      "X-Client-Version": "1.02.032",
      "Accept-Language": "id"
    };
  }
  async req(path, params = {}) {
    console.log(`[REQ] ${path}`);
    try {
      const {
        data
      } = await axios.get(`${this.base}${path}`, {
        params: {
          lang: "id",
          ...params
        },
        headers: this.headers
      });
      console.log(`[OK] ${path}`);
      return data;
    } catch (err) {
      console.error(`[ERR] ${path}:`, err?.message || err);
      throw err;
    }
  }
  parse_chord(html) {
    try {
      const $ = cheerio.load(html);
      let result = "";
      $("pre").contents().each((i, el) => {
        if (el.type === "text") {
          result += el.data;
        } else if (el.name === "span" && $(el).hasClass("u-chord")) {
          result += `[${$(el).text()}]`;
        }
      });
      return result.trim() || html;
    } catch (err) {
      console.error("[PARSE ERR]:", err?.message || err);
      return html;
    }
  }
  async home() {
    const res = await this.req("/chord/recommendation/");
    return res;
  }
  async search({
    query
  }) {
    const res = await this.req("/chord/search/", {
      q: query
    });
    return res;
  }
  async detail({
    chord_id
  }) {
    const res = await this.req(`/chord/detail/${chord_id}/`);
    if (res?.payload?.content) {
      const parsed = this.parse_chord(res.payload.content);
      res.payload.chord_parsed = parsed;
      res.payload.chord_original = res.payload.content;
      delete res.payload.content;
    }
    return res;
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
      actions: ["home", "search", "detail"]
    });
  }
  const api = new UChord();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.chord_id) {
          return res.status(400).json({
            error: "Parameter 'chord_id' wajib diisi untuk action 'detail'. Contoh: 6041a6cfaa7864374dd2d6a3"
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["home", "search", "detail"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}