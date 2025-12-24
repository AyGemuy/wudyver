import axios from "axios";
class MX {
  constructor(apiKey = "1fa457017b5da4afa11cec83fa21034d") {
    this.config = {
      baseUrl: "https://api.musixmatch.com/ws/1.1",
      apiKey: apiKey,
      timeout: 15e3,
      endpoints: {
        match: "matcher.track.get",
        matchLyrics: "matcher.lyrics.get",
        matchSub: "matcher.subtitle.get",
        lyrics: "track.lyrics.get",
        track: "track.get",
        mood: "track.lyrics.mood.get",
        sub: "track.subtitle.get",
        richsync: "track.richsync.get",
        snippet: "track.snippet.get",
        search: "track.search",
        transLyrics: "track.lyrics.translation.get",
        transSub: "track.subtitle.translation.get",
        artist: "artist.get",
        albums: "artist.albums.get",
        searchArtist: "artist.search",
        album: "album.get",
        albumTracks: "album.tracks.get",
        chartTracks: "chart.tracks.get",
        chartArtists: "chart.artists.get",
        genres: "music.genres.get"
      },
      required: {
        lyrics: ["commontrack_id"],
        track: ["commontrack_id|track_isrc"],
        mood: ["commontrack_id"],
        artist: ["artist_id"],
        albums: ["artist_id"],
        searchArtist: ["q_artist"],
        album: ["album_id"],
        albumTracks: ["album_id"],
        transLyrics: ["commontrack_id", "selected_language"],
        transSub: ["commontrack_id", "selected_language"]
      }
    };
    this.ax = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout
    });
  }
  validate(action, params) {
    const required = this.config.required[action];
    if (!required) return {
      valid: true
    };
    for (const field of required) {
      if (field.includes("|")) {
        const fields = field.split("|");
        if (!fields.some(f => params[f])) {
          return {
            valid: false,
            error: `Salah satu dari [${fields.join(", ")}] wajib diisi`
          };
        }
      } else {
        if (!params[field]) {
          return {
            valid: false,
            error: `Parameter '${field}' wajib diisi`
          };
        }
      }
    }
    return {
      valid: true
    };
  }
  async call(action, params = {}) {
    const validation = this.validate(action, params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: 400
      };
    }
    const ep = this.config.endpoints[action];
    if (!ep) {
      return {
        success: false,
        error: `Action '${action}' tidak ditemukan`,
        code: 404
      };
    }
    const url = `${ep}.json`;
    const payload = {
      apikey: this.config.apiKey,
      ...params
    };
    console.log(`→ GET ${ep}`, payload);
    try {
      const {
        data,
        status
      } = await this.ax.get(url, {
        params: payload
      });
      const body = data?.message?.body ?? {};
      const header = data?.message?.header ?? {};
      console.log(`← ${ep} [${status}] ${header.status_code}`);
      return {
        success: header.status_code === 200,
        data: body,
        header: header
      };
    } catch (err) {
      const code = err.response?.data?.message?.header?.status_code ?? 500;
      const hint = err.response?.data?.message?.header?.hint ?? err.message;
      console.error(`✖ ${ep} [${code}] ${hint}`);
      return {
        success: false,
        error: hint,
        code: code
      };
    }
  }
  async match(params) {
    try {
      return await this.call("match", params);
    } catch (err) {
      console.error("[match]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async matchLyrics(params) {
    try {
      return await this.call("matchLyrics", params);
    } catch (err) {
      console.error("[matchLyrics]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async matchSub(params) {
    try {
      return await this.call("matchSub", params);
    } catch (err) {
      console.error("[matchSub]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async lyrics(params) {
    try {
      return await this.call("lyrics", params);
    } catch (err) {
      console.error("[lyrics]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async track(params) {
    try {
      return await this.call("track", params);
    } catch (err) {
      console.error("[track]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async mood(params) {
    try {
      return await this.call("mood", params);
    } catch (err) {
      console.error("[mood]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async sub(params) {
    try {
      return await this.call("sub", params);
    } catch (err) {
      console.error("[sub]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async richsync(params) {
    try {
      return await this.call("richsync", params);
    } catch (err) {
      console.error("[richsync]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async search(params) {
    try {
      return await this.call("search", params);
    } catch (err) {
      console.error("[search]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async snippet(params) {
    try {
      return await this.call("snippet", params);
    } catch (err) {
      console.error("[snippet]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async transLyrics(params) {
    try {
      return await this.call("transLyrics", params);
    } catch (err) {
      console.error("[transLyrics]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async transSub(params) {
    try {
      return await this.call("transSub", params);
    } catch (err) {
      console.error("[transSub]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async artist(params) {
    try {
      return await this.call("artist", params);
    } catch (err) {
      console.error("[artist]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async albums(params) {
    try {
      return await this.call("albums", params);
    } catch (err) {
      console.error("[albums]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async searchArtist(params) {
    try {
      return await this.call("searchArtist", params);
    } catch (err) {
      console.error("[searchArtist]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async album(params) {
    try {
      return await this.call("album", params);
    } catch (err) {
      console.error("[album]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async albumTracks(params) {
    try {
      return await this.call("albumTracks", params);
    } catch (err) {
      console.error("[albumTracks]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async chartTracks(params = {
    country: "us"
  }) {
    try {
      return await this.call("chartTracks", params);
    } catch (err) {
      console.error("[chartTracks]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async chartArtists(params = {
    country: "us"
  }) {
    try {
      return await this.call("chartArtists", params);
    } catch (err) {
      console.error("[chartArtists]", err);
      return {
        success: false,
        error: err.message,
        code: 500
      };
    }
  }
  async genres() {
    try {
      return await this.call("genres");
    } catch (err) {
      console.error("[genres]", err);
      return {
        success: false,
        error: err.message,
        code: 500
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
      success: false,
      error: "Parameter 'action' wajib"
    });
  }
  const api = new MX();
  try {
    const actions = {
      match: () => api.match(params),
      matchLyrics: () => api.matchLyrics(params),
      matchSub: () => api.matchSub(params),
      lyrics: () => api.lyrics(params),
      track: () => api.track(params),
      mood: () => api.mood(params),
      sub: () => api.sub(params),
      richsync: () => api.richsync(params),
      snippet: () => api.snippet(params),
      search: () => api.search(params),
      transLyrics: () => api.transLyrics(params),
      transSub: () => api.transSub(params),
      artist: () => api.artist(params),
      albums: () => api.albums(params),
      searchArtist: () => api.searchArtist(params),
      album: () => api.album(params),
      albumTracks: () => api.albumTracks(params),
      chartTracks: () => api.chartTracks(params),
      chartArtists: () => api.chartArtists(params),
      genres: () => api.genres()
    };
    if (!actions[action]) {
      return res.status(400).json({
        success: false,
        error: `Action '${action}' tidak valid`,
        available: Object.keys(actions)
      });
    }
    const result = await actions[action]();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error(`[MX ERROR] ${action}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}