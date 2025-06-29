import axios from "axios";
import crypto from "crypto";
class Downloader {
  constructor() {
    this.hosts = [{
      base: "https://anonyig.com",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739381824973,
      key: "5afb47490491edfebd8d9ced642d08b96107845bb56cad4affa85b921babdf95"
    }, {
      base: "https://gramsnap.com",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1750075025604,
      key: "b19a64132b1a1f9d73a4cc2d008786b20af77f562fad17e3994b2b5c10274976"
    }, {
      base: "https://storiesig.info",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1749724963437,
      key: "b72fe394ae93764893751214e145ddd30d96dfe8700962857adc1e5a71611037"
    }, {
      base: "https://igram.world",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1749725574002,
      key: "d259a13e885a92b6536070f11f09a62e8a4fda59eb7bd2f012ab7935f88ee776"
    }, {
      base: "https://sssinstagram.com",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1750149828111,
      key: "a695a3ad90046a06b9e8d24b8bfd723ed42f7c27e9ee52a9cb10a345f25355ff"
    }, {
      base: "https://instasupersave.com",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1750202590767,
      key: "18ca2de3f2396e8608aa1f1eb9dbb4b187510b0d289983151faac41685458219"
    }, {
      base: "https://snapinsta.guru",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1747899817053,
      key: "3605c9937352167908e3a1eb1cd8ff1fee75f6b94f45737903270926c07bb70a"
    }, {
      base: "https://picuki.site",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1746520014774,
      key: "299f3bbb75f2bf6e408db3aed0e52e6289329e2a7c876e788375c0aa1c65f711"
    }];
  }
  getHeaders(apiBase) {
    const userAgents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15", "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Mobile Safari/537.36", "Postify/1.0.0"];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    return {
      authority: new URL(apiBase).host,
      origin: apiBase,
      referer: apiBase,
      "user-agent": randomUserAgent,
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9"
    };
  }
  async getTs(apiBase, msecEndpoint) {
    let baseUrlForMsec = apiBase;
    if (apiBase.includes("igram.world") || apiBase.includes("storiesig.info")) {
      baseUrlForMsec = apiBase.includes("igram.world") ? "https://api.igram.world" : "https://api.storiesig.info";
    }
    try {
      console.log(`[TS] Mengambil timestamp dari: ${baseUrlForMsec}${msecEndpoint}`);
      const {
        data
      } = await axios.get(`${baseUrlForMsec}${msecEndpoint}`, {
        headers: this.getHeaders(apiBase)
      });
      console.log(`[TS] Timestamp berhasil diambil: ${data.msec}`);
      return Math.floor(data.msec * 1e3);
    } catch (error) {
      console.error(`[TS ERROR] Gagal mengambil timestamp dari ${baseUrlForMsec}${msecEndpoint}: ${error.message}`);
      return 0;
    }
  }
  async fetch({
    url,
    hostIndex = 0,
    ...options
  }) {
    const hostConfig = this.hosts[hostIndex];
    if (!hostConfig) {
      throw new Error(`Host pada indeks "${hostIndex}" tidak ditemukan.`);
    }
    const {
      base,
      msec,
      convert,
      timestamp,
      key
    } = hostConfig;
    console.log(`[FETCH] Memulai proses download untuk URL: ${url} menggunakan host: ${base}`);
    try {
      const time = await this.getTs(base, msec);
      const ab = Date.now() - (time ? Date.now() - time : 0);
      const hash = `${url}${ab}${key}`;
      const signature = crypto.createHash("sha256").update(hash).digest("hex");
      let convertApiBase = base;
      if (base.includes("igram.world")) {
        convertApiBase = "https://api.igram.world";
      }
      console.log(`[FETCH] Mengirim permintaan konversi ke: ${convertApiBase}${convert}`);
      const {
        data
      } = await axios.post(`${convertApiBase}${convert}`, {
        url: url,
        ts: ab,
        _ts: timestamp,
        _tsc: time ? Date.now() - time : 0,
        _s: signature
      }, {
        headers: this.getHeaders(base),
        ...options
      });
      console.log(`[FETCH] Respon konversi berhasil diterima dari ${convertApiBase}.`);
      return data;
    } catch (error) {
      console.error(`[FETCH ERROR] Gagal mengkonversi URL ${url} dengan host ${base}: ${error.message}`);
      throw new Error(`Gagal mengunduh konten: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new Downloader();
    const response = await downloader.fetch(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}