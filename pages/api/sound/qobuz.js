import fetch from "node-fetch";
class QobuzAPI {
  constructor() {
    this.baseURL = "https://us.qobuz.squid.wtf/api";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async get(endpoint, {
    params = {},
    signal
  } = {}) {
    try {
      const url_params = new URLSearchParams(params).toString();
      const url = `${this.baseURL}${endpoint}?${url_params}`;
      console.log(`🌐 Mengirim permintaan GET ke: ${url}`);
      const res = await fetch(url, {
        headers: this.headers,
        signal: signal
      });
      if (!res.ok) {
        throw new Error(`Gagal memuat data dari ${endpoint}: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      console.log(`✅ Permintaan ke ${endpoint} berhasil.`);
      return json;
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn(`⚠️ Permintaan ke ${endpoint} dibatalkan.`);
      } else {
        console.error(`❌ Terjadi kesalahan saat mengambil data dari ${endpoint}:`, error.message);
      }
      return null;
    }
  }
  async search_music({
    query,
    offset = 0,
    limit = 10
  } = {}) {
    if (!query) {
      console.error("❌ Paramenter 'query' harus disertakan.");
      return null;
    }
    return this.get("/get-music", {
      params: {
        q: query,
        offset: offset,
        limit: limit
      }
    });
  }
  async get_album({
    album_id
  } = {}) {
    if (!album_id) {
      console.error("❌ Paramenter 'album_id' harus disertakan.");
      return null;
    }
    return this.get("/get-album", {
      params: {
        album_id: album_id
      }
    });
  }
  async download_track({
    track_id,
    quality = 27,
    signal
  } = {}) {
    if (!track_id) {
      console.error("❌ Paramenter 'track_id' harus disertakan.");
      return null;
    }
    return this.get("/download-music", {
      params: {
        track_id: track_id,
        quality: quality
      },
      signal: signal
    });
  }
  async get_releases({
    artist_id,
    offset = 0,
    limit = 10,
    release_type
  } = {}) {
    if (!artist_id) {
      console.error("❌ Paramenter 'artist_id' harus disertakan.");
      return null;
    }
    const params = {
      artist_id: artist_id,
      offset: offset,
      limit: limit
    };
    if (release_type) {
      params.release_type = release_type;
    }
    return this.get("/get-releases", {
      params: params
    });
  }
  async get_artist({
    artist_id
  } = {}) {
    if (!artist_id) {
      console.error("❌ Paramenter 'artist_id' harus disertakan.");
      return null;
    }
    return this.get("/get-artist", {
      params: {
        artist_id: artist_id
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: "search_music | get_album | download_track | get_releases | get_artist"
    });
  }
  const qobuz = new QobuzAPI();
  const allowed_actions = ["search_music", "get_album", "download_track", "get_releases", "get_artist"];
  if (!allowed_actions.includes(action)) {
    return res.status(400).json({
      error: `Invalid action: ${action}. Allowed: ${allowed_actions.join(" | ")}`
    });
  }
  try {
    const result = await qobuz[action](params);
    if (result === null) {
      return res.status(500).json({
        error: `Failed to process action: ${action}. Check the server logs.`
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}