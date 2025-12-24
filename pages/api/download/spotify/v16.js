import axios from "axios";
class SpotDownloader {
  constructor() {
    this.api = axios.create({
      baseURL: "https://spotdown.org/api",
      timeout: 3e5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        Referer: "https://spotdown.org/",
        "Sec-CH-UA": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "Sec-CH-UA-Mobile": "?1",
        "Sec-CH-UA-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Priority: "u=1, i"
      }
    });
    this.api.interceptors.request.use(req => {
      console.log("[REQ]", req.method.toUpperCase(), req.url);
      return req;
    });
    this.api.interceptors.response.use(res => {
      console.log("[RES RAW]");
      return res;
    });
  }
  sanitizeName(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, " ").trim().substring(0, 200);
  }
  async getSongDetails(spotifyUrl) {
    try {
      const {
        data
      } = await this.api.get(`/song-details?url=${encodeURIComponent(spotifyUrl)}`);
      return {
        success: true,
        songs: data.songs || [],
        type: data.contentType || "track"
      };
    } catch (err) {
      console.error("[ERROR getSongDetails]", err.response?.data || err.message);
      return {
        success: false,
        error: err.response?.status === 429 ? "Rate limit – tunggu 1 jam" : err.response?.data?.message || err.message
      };
    }
  }
  async checkCache(trackUrl) {
    try {
      const {
        data
      } = await this.api.get(`/check-direct-download?url=${encodeURIComponent(trackUrl)}`);
      return data || {
        cached: false
      };
    } catch {
      return {
        cached: false
      };
    }
  }
  async waitForStream(trackUrl) {
    for (let i = 0; i < 80; i++) {
      try {
        const {
          data
        } = await this.api.get(`/stream-status?url=${encodeURIComponent(trackUrl)}`);
        if (data?.streaming) {
          console.log("[STREAM OK]", trackUrl);
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1e3));
    }
  }
  async downloadFromDirectLink(directUrl) {
    try {
      const {
        data
      } = await this.api.get(directUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(data);
      return {
        success: true,
        base64: buffer.toString("base64"),
        buffer: buffer
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async downloadViaApi(trackUrl) {
    try {
      const {
        data
      } = await this.api.post("/download", {
        url: trackUrl
      }, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(data);
      return {
        success: true,
        base64: buffer.toString("base64"),
        buffer: buffer
      };
    } catch (err) {
      if (err.response?.status === 500) {
        console.log("[RETRY 500] Mengulang download...");
        return this.downloadViaApi(trackUrl);
      }
      return {
        success: false,
        error: err.response?.status === 429 ? "Rate limit" : err.message || "Download gagal"
      };
    }
  }
  async download({
    url: spotifyUrl,
    format = "base64"
  }) {
    console.log("[MULAI]", spotifyUrl);
    const details = await this.getSongDetails(spotifyUrl);
    if (!details.success) {
      return {
        success: false,
        error: details.error,
        url: spotifyUrl,
        downloadedAt: new Date().toISOString()
      };
    }
    const songsResult = [];
    for (const song of details.songs) {
      const cache = await this.checkCache(song.url);
      let dl;
      if (cache.cached && cache.downloadUrl) {
        console.log("[CACHE HIT]", song.title);
        dl = await this.downloadFromDirectLink(cache.downloadUrl);
      } else {
        console.log("[DOWNLOAD API]", song.title);
        dl = await this.downloadViaApi(song.url);
        if (dl.success && !cache.cached) await this.waitForStream(song.url);
      }
      const filename = `${this.sanitizeName(song.title)}_spotdown.org.mp3`;
      const sizeMB = dl.success ? Number((format === "buffer" ? dl.buffer.byteLength : dl.base64.length * .75) / 1024 / 1024).toFixed(2) : null;
      const item = {
        title: song.title,
        artist: song.artist,
        album: song.album || null,
        duration: song.duration || null,
        thumbnail: song.thumbnail || null,
        spotifyUrl: song.url,
        filename: filename,
        sizeMB: sizeMB,
        success: dl.success
      };
      if (dl.success) {
        format === "buffer" ? item.buffer = dl.buffer : item.base64 = dl.base64;
      } else {
        item.error = dl.error;
      }
      songsResult.push(item);
    }
    const ok = songsResult.filter(s => s.success).length;
    return {
      success: ok > 0,
      url: spotifyUrl,
      type: details.type,
      total: details.songs.length,
      successful: ok,
      failed: details.songs.length - ok,
      downloadedAt: new Date().toISOString(),
      songs: songsResult
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SpotDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}