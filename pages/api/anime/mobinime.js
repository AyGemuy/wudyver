import axios from "axios";
class Mobinime {
  constructor() {
    this.inst = axios.create({
      baseURL: "https://air.vunime.my.id/mobinime",
      headers: {
        "accept-encoding": "gzip",
        "content-type": "application/x-www-form-urlencoded; charset=utf-8",
        host: "air.vunime.my.id",
        "user-agent": "Dart/3.3 (dart:io)",
        "x-api-key": "ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8"
      }
    });
  }
  async home() {
    try {
      console.log("[home] Fetching homepage...");
      const {
        data
      } = await this.inst.get("/pages/homepage");
      console.log("[home] Success");
      return data;
    } catch (e) {
      console.error("[home] Error:", e?.message);
      throw new Error(e?.message || "Failed to fetch homepage");
    }
  }
  async list(t, {
    p = "0",
    c = "15",
    g = ""
  } = {}) {
    try {
      console.log(`[list] Type: ${t}, Page: ${p}, Count: ${c}, Genre: ${g}`);
      const types = {
        series: "1",
        movie: "3",
        ova: "2",
        "live-action": "4"
      };
      const tid = types[t] || null;
      if (!tid) throw new Error(`Valid types: ${Object.keys(types).join(", ")}`);
      if (isNaN(p)) throw new Error("Invalid page");
      if (isNaN(c)) throw new Error("Invalid count");
      const genres = await this.genres();
      const gid = genres?.find(x => x?.title?.toLowerCase()?.replace(/\s+/g, "-") === g?.toLowerCase())?.id || null;
      if (g && !gid) throw new Error(`Valid genres: ${genres?.map(x => x?.title?.toLowerCase()?.replace(/\s+/g, "-"))?.join(", ")}`);
      const {
        data
      } = await this.inst.post("/anime/list", {
        perpage: c?.toString() || "15",
        startpage: p?.toString() || "0",
        userid: "",
        sort: "",
        genre: gid || "",
        jenisanime: tid
      });
      console.log("[list] Success");
      return data;
    } catch (e) {
      console.error("[list] Error:", e?.message);
      throw new Error(e?.message || "Failed to fetch list");
    }
  }
  async genres() {
    try {
      console.log("[genres] Fetching genres...");
      const {
        data
      } = await this.inst.get("/anime/genre");
      console.log("[genres] Success");
      return data;
    } catch (e) {
      console.error("[genres] Error:", e?.message);
      throw new Error(e?.message || "Failed to fetch genres");
    }
  }
  async search(q, {
    p = "0",
    c = "25"
  } = {}) {
    try {
      console.log(`[search] Query: ${q}, Page: ${p}, Count: ${c}`);
      if (!q) throw new Error("Query required");
      if (isNaN(p)) throw new Error("Invalid page");
      if (isNaN(c)) throw new Error("Invalid count");
      const {
        data
      } = await this.inst.post("/anime/search", {
        perpage: c?.toString() || "25",
        startpage: p?.toString() || "0",
        q: q
      });
      console.log("[search] Success");
      return data;
    } catch (e) {
      console.error("[search] Error:", e?.message);
      throw new Error(e?.message || "Failed to search");
    }
  }
  async detail(id) {
    try {
      console.log(`[detail] ID: ${id}`);
      if (!id || isNaN(id)) throw new Error("Valid id required");
      const {
        data
      } = await this.inst.post("/anime/detail", {
        id: id?.toString()
      });
      console.log("[detail] Success");
      return data;
    } catch (e) {
      console.error("[detail] Error:", e?.message);
      throw new Error(e?.message || "Failed to fetch detail");
    }
  }
  async stream(aid, eid, {
    q = "HD"
  } = {}) {
    try {
      console.log(`[stream] AnimeID: ${aid}, EpisodeID: ${eid}, Quality: ${q}`);
      if (!aid || !eid) throw new Error("Anime ID & Episode ID required");
      const {
        data: srv
      } = await this.inst.post("/anime/get-server-list", {
        id: eid?.toString(),
        animeId: aid?.toString(),
        jenisAnime: "1",
        userId: ""
      });
      console.log("[stream] Got server, fetching URL...");
      const {
        data
      } = await this.inst.post("/anime/get-url-video", {
        url: srv?.serverurl || "",
        quality: q || "HD",
        position: "0"
      });
      const url = data?.url || null;
      if (!url) throw new Error("Stream URL not found");
      console.log("[stream] Success");
      return url;
    } catch (e) {
      console.error("[stream] Error:", e?.message);
      throw new Error(e?.message || "Failed to get stream");
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
      actions: ["home", "list", "genres", "search", "detail", "stream"]
    });
  }
  const api = new Mobinime();
  try {
    let result;
    switch (action) {
      case "home":
        result = await api.home();
        break;
      case "list":
        if (!params.type) {
          return res.status(400).json({
            error: "Parameter 'type' wajib diisi untuk action 'list'",
            valid_types: ["series", "movie", "ova", "live-action"]
          });
        }
        result = await api.list(params.type, {
          p: params.page || params.p,
          c: params.count || params.c,
          g: params.genre || params.g
        });
        break;
      case "genres":
        result = await api.genres();
        break;
      case "search":
        if (!params.query && !params.q) {
          return res.status(400).json({
            error: "Parameter 'query' atau 'q' wajib diisi untuk action 'search'"
          });
        }
        result = await api.search(params.query || params.q, {
          p: params.page || params.p,
          c: params.count || params.c
        });
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'detail'"
          });
        }
        result = await api.detail(params.id);
        break;
      case "stream":
        if (!params.aid || !params.eid) {
          return res.status(400).json({
            error: "Parameter 'aid' (anime id) dan 'eid' (episode id) wajib diisi untuk action 'stream'"
          });
        }
        result = await api.stream(params.aid, params.eid, {
          q: params.quality || params.q
        });
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["home", "list", "genres", "search", "detail", "stream"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}