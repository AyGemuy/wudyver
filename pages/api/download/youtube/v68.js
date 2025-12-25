import axios from "axios";
import https from "https";
class SaveNow {
  constructor() {
    this.hosts = ["https://p.savenow.to", "https://p.lbserver.xyz"];
    this.api = "dfcb6d76f2f6a9894gjkege8a4ab232222";
    this.base = this.hosts[0];
    this.fmts = ["144", "240", "360", "480", "720", "1080", "1440", "4k", "8k", "mp3", "m4a", "webm", "aac", "flac", "opus", "ogg", "wav"];
    this.client = axios.create({
      httpsAgent: new https.Agent({
        keepAlive: true,
        rejectUnauthorized: false
      }),
      timeout: 6e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://downloaderto.com",
        referer: "https://downloaderto.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  log(step, data = {}) {
    console.log(JSON.stringify({
      time: new Date().toISOString(),
      step: step,
      ...data
    }));
  }
  ytId(s) {
    let e = s?.match(/(?:v=|shorts\/|be\/)([a-zA-Z0-9\-_]{11})/);
    return e ? e[1] : null;
  }
  isYt(u) {
    return /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/.test(u);
  }
  async req(path, params) {
    let err = null;
    for (const host of this.hosts) {
      try {
        this.base = host;
        const res = await this.client.get(`${host}${path}`, {
          params: params
        });
        return res?.data;
      } catch (e) {
        err = e;
        this.log("fallback_retry", {
          host: host,
          msg: e.message
        });
      }
    }
    throw new Error(`Connection failed: ${err?.message}`);
  }
  async prg(id) {
    let attempts = 0;
    while (attempts++ < 60) {
      try {
        const data = await this.req("/api/progress", {
          id: id
        });
        this.log("polling", {
          id: id,
          progress: (data?.progress / 10 || 0) + "%",
          status: data?.text
        });
        if (data?.success === 1 && (data?.progress >= 1e3 || data?.text?.toLowerCase() === "finished")) {
          return data;
        }
        if (data?.success === 0) break;
      } catch (e) {
        break;
      }
      await new Promise(r => setTimeout(r, 3e3));
    }
    return null;
  }
  async one(url, format) {
    try {
      const id = this.ytId(url);
      const target = this.isYt(url) && id ? `https://www.youtube.com/watch?v=${id}` : url;
      const activeFmt = this.fmts.includes(String(format)) ? String(format) : "360";
      const init = await this.req("/ajax/download.php", {
        copyright: 0,
        format: activeFmt,
        url: target,
        api: this.api
      });
      if (!init?.success) return {
        success: false,
        url: url,
        msg: "Init failed"
      };
      const pollResult = await this.prg(init.id);
      return {
        success: !!pollResult?.download_url,
        title: init?.info?.title || init?.title || "Unknown",
        thumbnail: init?.info?.image || null,
        yt_id: id,
        duration: init?.extended_duration || "N/A",
        id: init.id,
        format: activeFmt,
        url: pollResult?.download_url || null,
        status: pollResult?.text || "Timeout",
        alternatives: pollResult?.alternative_download_urls || [],
        server: this.base,
        api_key: this.api
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
        url: url
      };
    }
  }
  async download({
    url,
    format = 360,
    ...rest
  }) {
    try {
      if (!url) return {
        success: false,
        message: "URL required"
      };
      const activeFmt = this.fmts.includes(String(format)) ? String(format) : "360";
      this.log("start", {
        url: url,
        format: activeFmt
      });
      if (url.includes("list=") && this.isYt(url)) {
        this.log("playlist_detected");
        const list = await this.req("/api/ajax/playlistJSON", {
          format: activeFmt,
          api: this.api,
          url: url
        });
        if (!Array.isArray(list)) return {
          success: false,
          message: "Failed to fetch playlist"
        };
        const items = [];
        for (const item of list) {
          this.log("processing_item", {
            item_url: item.url
          });
          items.push(await this.one(item.url, activeFmt));
        }
        return {
          success: items.every(i => i.success),
          is_playlist: true,
          total: list.length,
          results: items
        };
      }
      const res = await this.one(url, activeFmt);
      this.log("finish", {
        title: res?.info?.title
      });
      return res;
    } catch (err) {
      this.log("fatal_error", {
        msg: err.message
      });
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SaveNow();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}