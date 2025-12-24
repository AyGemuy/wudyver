import axios from "axios";
class LyricAPI {
  constructor() {
    this.cfg = {
      base: "https://lyric-jumper-en.petitlyrics.com",
      api: "https://lyric-jumper-api.appspot.com",
      timeout: 1e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://lyric-jumper-en.petitlyrics.com/",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01"
      }
    };
  }
  async req({
    url,
    params = {},
    method = "GET",
    responseType = "json"
  }) {
    try {
      const res = await axios({
        method: method,
        url: url,
        params: params,
        timeout: this.cfg.timeout,
        headers: this.cfg.headers,
        responseType: responseType
      });
      return res.data;
    } catch (err) {
      console.error(`[LyricAPI] Failed: ${url} - ${err.message}`);
      if (err.response) {
        console.error("Status:", err.response.status);
      }
      return null;
    }
  }
  async find({
    q,
    limit = 10
  }) {
    if (!q) return [];
    const url = `${this.cfg.base}/api/artist/search`;
    const data = await this.req({
      url: url,
      params: {
        q: q,
        limit: limit
      }
    });
    return data || [];
  }
  async topics({
    id,
    limit = 10
  }) {
    if (!id) return [];
    const url = `${this.cfg.base}/api/artist/topics/${id}/${limit}`;
    const data = await this.req({
      url: url
    });
    return data || [];
  }
  async songs({
    artistId,
    topicId
  }) {
    if (!artistId || !topicId) return [];
    const url = `${this.cfg.base}/api/song/topic_songs/${artistId}/${topicId}`;
    const data = await this.req({
      url: url
    });
    return data || [];
  }
  async song({
    id
  }) {
    if (!id) return {};
    const url = `${this.cfg.base}/api/song/info/${id}`;
    return await this.req({
      url: url
    }) || {};
  }
  async lyrics({
    id
  }) {
    if (!id) return {};
    const url = `${this.cfg.api}/lyrics/${id}`;
    const data = await this.req({
      url: url,
      responseType: "text"
    });
    if (typeof data === "string") {
      try {
        const decodedString = Buffer.from(data, "base64").toString("utf-8");
        const json = JSON.parse(decodedString);
        return this.parseLyrics(json);
      } catch (err) {
        console.error("Parse lyrics error:", err.message);
        return {};
      }
    }
    return {};
  }
  parseLyrics(data) {
    if (!data || !data.lines) return {
      lines: []
    };
    return {
      type: data.type || 1,
      lines: data.lines.map(line => {
        const text = line.words && line.words.length > 0 ? line.words.map(w => w.string).join("") : "";
        return {
          text: text,
          words: line.words
        };
      }).filter(line => line.text)
    };
  }
  async phrases({
    artistId,
    topicId
  }) {
    if (!artistId || !topicId) return [];
    const url = `${this.cfg.base}/api/topic/phrase/${artistId}/${topicId}`;
    return await this.req({
      url: url
    }) || [];
  }
  async yt({
    id
  }) {
    if (!id) return [];
    const url = `${this.cfg.base}/api/song/search_youtube/${id}`;
    return await this.req({
      url: url
    }) || [];
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new LyricAPI();
  try {
    let response;
    switch (action) {
      case "search":
      case "find":
        if (!params.q) {
          return res.status(400).json({
            error: "Parameter 'q' (query) wajib diisi untuk action 'search'."
          });
        }
        response = await api.find(params);
        break;
      case "topics":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' (artist id) wajib diisi untuk action 'topics'."
          });
        }
        response = await api.topics(params);
        break;
      case "songs":
        if (!params.artistId || !params.topicId) {
          return res.status(400).json({
            error: "Parameter 'artistId' dan 'topicId' wajib diisi untuk action 'songs'."
          });
        }
        response = await api.songs(params);
        break;
      case "info":
      case "song":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' (song id) wajib diisi untuk action 'info'."
          });
        }
        response = await api.song(params);
        break;
      case "lyrics":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' (lyric id) wajib diisi untuk action 'lyrics'."
          });
        }
        response = await api.lyrics(params);
        break;
      case "phrases":
        if (!params.artistId || !params.topicId) {
          return res.status(400).json({
            error: "Parameter 'artistId' dan 'topicId' wajib diisi untuk action 'phrases'."
          });
        }
        response = await api.phrases(params);
        break;
      case "youtube":
      case "yt":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' (song id) wajib diisi untuk action 'youtube'."
          });
        }
        response = await api.yt(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'topics', 'songs', 'info', 'lyrics', 'phrases', 'youtube'.`
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