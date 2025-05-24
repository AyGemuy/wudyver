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
      timestamp: 1739381789885,
      key: "7efd2a2ac7441343c38386f4ca733b5ee1079e9b57f872c70d5516a9d24bc0d6"
    }, {
      base: "https://storiesig.info",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739185248317,
      key: "40a71e771b673e3a35200acdd331bbd616fc4ba76c6d77d821a25985e46fb488"
    }, {
      base: "https://igram.world",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739185248317,
      key: "40a71e771b673e3a35200acdd331bbd616fc4ba76c6d77d821a25985e46fb488"
    }, {
      base: "https://sssinstagram.com",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739186038417,
      key: "19e08ff42f18559b51825685d917c5c9e9d89f8a5c1ab147f820f46e94c3df26"
    }, {
      base: "https://instasupersave.com",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739541702771,
      key: "328324ca468c9abe64639504c4c269e5290cd32585ab9ede2ba67157c632d189"
    }];
  }
  async times(apiBase, msecEndpoint) {
    try {
      const {
        data
      } = await axios.get(`${apiBase}${msecEndpoint}`, {
        headers: this.getHeaders(apiBase)
      });
      return Math.floor(data.msec * 1e3);
    } catch (error) {
      console.error("Error fetching timestamp:", error);
      return 0;
    }
  }
  getHeaders(apiBase) {
    return {
      authority: new URL(apiBase).host,
      origin: apiBase,
      referer: apiBase,
      "user-agent": "Postify/1.0.0"
    };
  }
  async download(url, hostIndex = 0) {
    const hostConfig = this.hosts[hostIndex];
    if (!hostConfig) {
      throw new Error(`Host at index "${hostIndex}" not found.`);
    }
    const {
      base,
      msec,
      convert,
      timestamp,
      key
    } = hostConfig;
    const time = await this.times(base, msec);
    const ab = Date.now() - (time ? Date.now() - time : 0);
    const hash = `${url}${ab}${key}`;
    const signature = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hash)).then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join(""));
    const {
      data
    } = await axios.post(`${base}${convert}`, {
      url: url,
      ts: ab,
      _ts: timestamp,
      _tsc: time ? Date.now() - time : 0,
      _s: signature
    }, {
      headers: this.getHeaders(base)
    });
    return data;
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      host
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new Downloader();
    const result = await downloader.download(url, host);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}