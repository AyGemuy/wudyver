import axios from "axios";
import crypto from "crypto";
class WpsMetadata {
  constructor({
    deviceId = "",
    wpsSid = ""
  } = {}) {
    this.deviceId = this.uuid().replace(/-/g, "");
    this.wpsSid = this.uuid().replace(/-/g, "");
    this.traceId = this.uuid().replace(/-/g, "");
    this.config = {
      ak: "AK_AX92FH0RDJUAKCGI",
      sk: "SK_H3XOLM0IRMO0CS4Q",
      siteUrl: "https://test.toolsmart.ai",
      baseURL: "https://ai.wps.com/ai_tools"
    };
    this.axios = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Origin: this.config.siteUrl,
        Referer: this.config.siteUrl + "/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }
  hmac(data, key) {
    return crypto.createHmac("sha256", key).update(data).digest("hex");
  }
  base64Encode(str) {
    return Buffer.from(str).toString("base64");
  }
  generateAuth({
    method,
    uri,
    timestamp,
    md5Content,
    nonce
  }) {
    const parts = [method, uri, timestamp, md5Content, nonce];
    if (this.deviceId) parts.push(this.deviceId);
    if (this.wpsSid) parts.push(this.wpsSid);
    const base = parts.join("&").toLowerCase();
    const sign = this.hmac(base, this.config.sk);
    const encoded = this.base64Encode(sign);
    return `WPS-INTL-1:${this.config.ak}:${timestamp}:${md5Content}:${this.deviceId}:${this.wpsSid}:${uri}:${nonce}:${encoded}`;
  }
  async metadata({
    url
  }) {
    try {
      const uri = "/api/video/metadata";
      const endpoint = `${uri}?trace_id=${this.traceId}`;
      const body = JSON.stringify({
        url: url
      });
      const md5 = this.md5(body);
      const nonce = this.uuid();
      const timestamp = Math.floor(Date.now() / 1e3).toString();
      const auth = this.generateAuth({
        method: "post",
        uri: uri,
        timestamp: timestamp,
        md5Content: md5,
        nonce: nonce
      });
      const res = await this.axios.post(endpoint, {
        url: url
      }, {
        headers: {
          Authorization: auth
        }
      });
      return res.data;
    } catch (e) {
      return {
        code: -1,
        error: e.message || e
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: "No URL"
      });
    }
    const yt = new WpsMetadata();
    const result = await yt.metadata(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}