import axios from "axios";
import crypto from "crypto";
class Ummy {
  constructor() {
    this.api = {
      base: "https://fastdl.app",
      msec: "/msec",
      convert: "/api/convert"
    };
    this.constant = {
      timestamp: 1750073054269,
      key: "b0844ba6fc5f09431155957a08d058cefc179acb469d5bafdc29097730c3ab01"
    };
    this.headers = {
      authority: "fastdl.app",
      origin: "https://fastdl.app",
      referer: "https://fastdl.app/",
      "user-agent": "Postify/1.0.0"
    };
  }
  async times() {
    try {
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.msec}`, {
        headers: this.headers
      });
      return Math.floor(data.msec * 1e3);
    } catch (error) {
      console.error("Error fetching timestamp:", error);
      return 0;
    }
  }
  async download(url) {
    const time = await this.times();
    const ab = Date.now() - (time ? Date.now() - time : 0);
    const hash = `${url}${ab}${this.constant.key}`;
    const signature = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hash)).then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join(""));
    const {
      data
    } = await axios.post(`${this.api.base}${this.api.convert}`, {
      url: url,
      ts: ab,
      _ts: this.constant.timestamp,
      _tsc: time ? Date.now() - time : 0,
      _s: signature
    }, {
      headers: this.headers
    });
    return data;
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No YouTube URL"
    });
    const downloader = new Ummy();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}