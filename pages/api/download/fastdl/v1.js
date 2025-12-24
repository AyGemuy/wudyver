import axios from "axios";
import crypto from "crypto";
import {
  URLSearchParams
} from "url";
class Ummy {
  constructor() {
    this.api = {
      base: "https://fastdl.app",
      base_wh: "https://api-wh.fastdl.app",
      msec: "/msec",
      convert: "/api/convert"
    };
    this.constant = {
      timestamp: 1763455936795,
      key: "bbe749c46624c168b1215f159f9712a2a1bdf44ccfba63203b4ccd9955186ebe"
    };
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      origin: "https://fastdl.app",
      referer: "https://fastdl.app/",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async times() {
    try {
      const getHeaders = {
        "user-agent": this.headers["user-agent"],
        accept: this.headers["accept"],
        "accept-language": this.headers["accept-language"],
        origin: this.headers["origin"],
        referer: this.headers["referer"]
      };
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.msec}`, {
        headers: getHeaders
      });
      return Math.floor(data.msec * 1e3);
    } catch (error) {
      console.error("Error fetching timestamp:", error);
      return 0;
    }
  }
  async download(url) {
    const time = await this.times();
    const time_diff = time ? Date.now() - time : 0;
    const ts_value = time ? time : Date.now();
    const hash = `${url}${ts_value}${this.constant.key}`;
    const signatureBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hash));
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    const postData = {
      sf_url: url,
      ts: ts_value.toString(),
      _ts: this.constant.timestamp.toString(),
      _tsc: time_diff.toString(),
      _s: signature
    };
    const formUrlEncodedBody = new URLSearchParams(postData).toString();
    const convertUrl = `${this.api.base_wh}${this.api.convert}`;
    const {
      data
    } = await axios.post(convertUrl, formUrlEncodedBody, {
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
      error: "No URL provided"
    });
    const downloader = new Ummy();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred"
    });
  }
}