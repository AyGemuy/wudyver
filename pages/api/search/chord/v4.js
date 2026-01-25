import axios from "axios";
class ChordMax {
  constructor() {
    this.base = "https://api.chordmaxapp.com/v2/app";
    this.key = "AiGr5vB3YqocUHNZX9HtILlfqNTBiwIODMeDpIYpy3bUe0MMjSLCpfUfQES4Dzf0aIRYXzidSblHrVpEtTvTM3Bro0LHGxSHaOIqUhEDBwTchxfZ93lx9tRgtJqJbE63";
    this.masterKey = "bab819a7cf78af0aedcded762c870ac8";
  }
  async req(path, params = {}) {
    console.log(`[REQ] ${path}`);
    try {
      const {
        data
      } = await axios.get(`${this.base}${path}`, {
        params: params,
        headers: {
          "User-Agent": "okhttp/4.10.0",
          "Accept-Encoding": "gzip",
          "x-api-key": this.key
        }
      });
      console.log(`[OK] ${path}`);
      return data;
    } catch (err) {
      console.error(`[ERR] ${path}:`, err?.message || err);
      throw err;
    }
  }
  decrypt(b64, hexKey) {
    try {
      const crypto = require("crypto");
      const key = Buffer.from(hexKey, "hex");
      const enc = Buffer.from(b64, "base64");
      if (enc.length < 28) return null;
      const iv = enc.subarray(0, 12);
      const tag = enc.subarray(enc.length - 16);
      const ct = enc.subarray(12, enc.length - 16);
      const dc = crypto.createDecipheriv("aes-128-gcm", key, iv);
      dc.setAuthTag(tag);
      let d = dc.update(ct);
      d = Buffer.concat([d, dc.final()]);
      return d.toString("utf-8");
    } catch (err) {
      console.error("[DECRYPT ERR]:", err?.message || err);
      return null;
    }
  }
  async latest({
    page = 1,
    size = 20
  } = {}) {
    return await this.req("/chord/latest", {
      page: page,
      size: size
    });
  }
  async popular({
    type = "weekly"
  } = {}) {
    const validTypes = ["daily", "weekly"];
    const t = validTypes.includes(type) ? type : "weekly";
    return await this.req(`/chord/popular/${t}`);
  }
  async search({
    query,
    type = "chord"
  } = {}) {
    const validTypes = ["chord", "artist", "lyric"];
    const t = validTypes.includes(type) ? type : "chord";
    const pathMap = {
      chord: "/chord/_search",
      artist: "/artist/_search",
      lyric: "/chord/_search/lyric"
    };
    const paramKey = type === "artist" ? "keyword" : "query";
    return await this.req(pathMap[t], {
      [paramKey]: query
    });
  }
  async keyword_rec() {
    return await this.req("/keyword/recommendation");
  }
  async popular_all() {
    return await this.req("/chord/popular");
  }
  async chord_rec() {
    return await this.req("/chord/recommendation");
  }
  async artist_popular() {
    return await this.req("/artist/popular");
  }
  async by_singer({
    singer_id
  }) {
    return await this.req(`/chord/by_singer/${singer_id}`);
  }
  async detail({
    chord_id
  }) {
    const res = await this.req(`/chord/${chord_id}`);
    if (res?.data?.chord) {
      const dec = this.decrypt(res.data.chord, this.masterKey);
      res.data.chord = dec || res.data.chord;
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
      actions: ["latest", "popular", "search", "keyword_rec", "popular_all", "chord_rec", "artist_popular", "by_singer", "detail"]
    });
  }
  const api = new ChordMax();
  try {
    let response;
    switch (action) {
      case "latest":
        response = await api.latest(params);
        break;
      case "popular":
        response = await api.popular(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            info: "Gunakan parameter 'type' untuk menentukan jenis pencarian (chord/artist/lyric). Default: chord"
          });
        }
        response = await api.search(params);
        break;
      case "keyword_rec":
        response = await api.keyword_rec();
        break;
      case "popular_all":
        response = await api.popular_all();
        break;
      case "chord_rec":
        response = await api.chord_rec();
        break;
      case "artist_popular":
        response = await api.artist_popular();
        break;
      case "by_singer":
        if (!params.singer_id) {
          return res.status(400).json({
            error: "Parameter 'singer_id' wajib diisi untuk action 'by_singer'."
          });
        }
        response = await api.by_singer(params);
        break;
      case "detail":
        if (!params.chord_id) {
          return res.status(400).json({
            error: "Parameter 'chord_id' wajib diisi untuk action 'detail'. Contoh: 66c952a2bb1b3dd52114512c"
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["latest", "popular", "search", "keyword_rec", "popular_all", "chord_rec", "artist_popular", "by_singer", "detail"]
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