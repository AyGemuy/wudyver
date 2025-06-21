import axios from "axios";
import crypto from "crypto";
class Downloader {
  constructor() {
    this.hosts = [{
      base: "https://ssyoutube.com",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739291970461,
      key: "092168e6fcb6cb2b3856214ddbb0d0794c098c98d6a9a262ab3de6186bdc4173"
    }, {
      base: "https://en4.onlinevideoconverter.pro",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739561149261,
      key: "a7142aa8726e4b0d2e0fcaa65525718527b61b448bbf9ed8d283c7c4b3cc1a72"
    }, {
      base: "https://ummy.net",
      msec: "/msec",
      convert: "/api/convert",
      timestamp: 1739475766883,
      key: "3ebc107aad6d9cc098c104daba29522ed56ebfe68256ef111b9805c2e59a8063"
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