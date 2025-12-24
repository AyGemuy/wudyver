import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class IgDl {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.hosts = [{
      base: "https://anonyig.com",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1762940332915,
      key: "e9fd4a500d4f0994fc6a6904dfb4a6e854e286cd56f4f8d212dc5a18211057df",
      payload: {
        format: "form",
        ref: "https://anonyig.com/en/"
      }
    }, {
      base: "https://gramsnap.com",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1762959817732,
      key: "3aa76a9fae4e4aeed77942a666b12eb9647244a34f14a4fd4b2c68d9b9200bc1",
      payload: {
        format: "form",
        ref: "https://gramsnap.com/en/"
      }
    }, {
      base: "https://storiesig.info",
      api: "https://api-wh.storiesig.info",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1762952666265,
      key: "bd8f830d1f4c85b75fd1c1c76f8fba1f5421189226a8715815450fb2a41bd598",
      payload: {
        format: "form",
        ref: "https://storiesig.info/"
      }
    }, {
      base: "https://igram.world",
      api: "https://api-wh.igram.world",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1763129421273,
      key: "36fc819c862897305f027cda96822a071a4a01b7f46bb4ffaac9b88a649d9c28",
      payload: {
        format: "form",
        ref: "https://igram.world/"
      }
    }, {
      base: "https://sssinstagram.com",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1763458291571,
      key: "701c4ea7812a249323c43f2773f893fa2e2522e8fc4b778b418b9a8c1d027483",
      payload: {
        format: "json",
        ref: null
      }
    }, {
      base: "https://instasupersave.com",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1763015662213,
      key: "80df0ff6afa58942f6e04e9e5b39acab9a9354776b76f3c05132c7b2cfbc66e6",
      payload: {
        format: "form",
        ref: "https://instasupersave.com/en/"
      }
    }, {
      base: "https://snapinsta.guru",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1763046454092,
      key: "45b0d27eeb978a1c4f8dd45a7a3f8713fa29f6a5c1c39589acd981b216d57a0d",
      payload: {
        format: "form",
        ref: "https://snapinsta.guru/",
        xsrf: true
      }
    }, {
      base: "https://picuki.site",
      msec: "/msec",
      convert: "/api/convert",
      ts: 1762941359243,
      key: "39f50b28e569e266e1b05abb78bf72723d75e37213122c2f0c742d2e6259f3d5",
      payload: {
        format: "form",
        ref: "https://picuki.site/",
        xsrf: true
      }
    }];
  }
  hdr(base, api) {
    const ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    const origin = api || base;
    const {
      host
    } = new URL(origin);
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: base,
      referer: base + "/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": api ? "same-site" : "same-origin",
      "user-agent": ua,
      authority: host
    };
  }
  async ms(base, api, path) {
    const url = (api || base) + path;
    console.log(`[TS] GET ${url}`);
    try {
      const {
        data
      } = await this.client.get(url, {
        headers: this.hdr(base, api)
      });
      console.log(`[TS] ✓ ${data?.msec || 0}`);
      return Math.floor((data?.msec || 0) * 1e3);
    } catch (e) {
      console.log(`[TS] ✗ ${e?.message || "fail"}`);
      return 0;
    }
  }
  sig(url, ab, ts, key) {
    return crypto.createHash("sha256").update(`${url}${ab}${key}`).digest("hex");
  }
  body(url, ab, ts, tsc, sig, fmt) {
    const obj = {
      url: url,
      ts: ab,
      _ts: ts,
      _tsc: tsc,
      _s: sig
    };
    return fmt === "json" ? obj : new URLSearchParams({
      sf_url: url,
      ...obj
    }).toString();
  }
  async xsrf(base) {
    try {
      console.log(`[XSRF] GET ${base}/`);
      await this.client.get(base + "/", {
        headers: this.hdr(base)
      });
      const cookies = await this.jar.getCookies(base);
      const xsrf = cookies.find(c => c.key === "XSRF-TOKEN");
      console.log(`[XSRF] ${xsrf ? "✓" : "✗"}`);
      return xsrf?.value || null;
    } catch (e) {
      console.log(`[XSRF] ✗ ${e?.message || "fail"}`);
      return null;
    }
  }
  async download({
    host,
    url,
    ...rest
  }) {
    const h = this.hosts[host || 0];
    if (!h) throw new Error(`Host ${host} not found`);
    console.log(`\n[DL] ${h.base}`);
    console.log(`[DL] URL: ${url}`);
    try {
      const api = h.api || null;
      const ms = await this.ms(h.base, api, h.msec);
      const ab = Date.now();
      const tsc = ms ? ab - ms : 0;
      const sig = this.sig(url, ab, h.ts, h.key);
      const fmt = h.payload?.format || "form";
      const data = this.body(url, ab, h.ts, tsc, sig, fmt);
      const hdrs = this.hdr(h.base, api);
      hdrs["content-type"] = fmt === "json" ? "application/json" : "application/x-www-form-urlencoded;charset=UTF-8";
      if (h.payload?.xsrf) {
        const token = await this.xsrf(h.base);
        if (token) hdrs["x-xsrf-token"] = decodeURIComponent(token);
      }
      const convertUrl = (api || h.base) + h.convert;
      console.log(`[DL] POST ${convertUrl}`);
      const cfg = {
        headers: hdrs,
        ...rest
      };
      const res = await this.client.post(convertUrl, data, cfg);
      console.log(`[DL] ✓ ${res?.status || 200}\n`);
      return res?.data || res;
    } catch (e) {
      console.log(`[DL] ✗ ${e?.response?.status || 500}: ${e?.message || "fail"}\n`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    host = 0,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  console.log(`[API] ${req.method} /api/download`);
  console.log(`[API] Host: ${host}, URL: ${url || "missing"}`);
  if (!url) {
    console.log("[API] ✗ 400 - URL required\n");
    return res.status(400).json({
      success: false,
      error: "URL parameter is required",
      usage: {
        method: "GET or POST",
        params: {
          url: "Instagram URL (required)",
          host: "Host index 0-7 (optional, default: 0)"
        },
        example: "/api/download?url=https://instagram.com/reel/ABC123&host=0"
      }
    });
  }
  try {
    const dl = new IgDl();
    const hostNum = parseInt(host) || 0;
    if (hostNum < 0 || hostNum >= dl.hosts.length) {
      console.log(`[API] ✗ 400 - Invalid host index\n`);
      return res.status(400).json({
        success: false,
        error: `Host index must be between 0-${dl.hosts.length - 1}`,
        availableHosts: dl.hosts.map((h, i) => ({
          index: i,
          name: h.base.replace("https://", "")
        }))
      });
    }
    const result = await dl.download({
      host: hostNum,
      url: url,
      ...params
    });
    console.log("[API] ✓ 200 - Success\n");
    return res.status(200).json(result);
  } catch (e) {
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || e?.message || "Internal server error";
    console.log(`[API] ✗ ${status} - ${msg}\n`);
    return res.status(status).json({
      success: false,
      error: msg,
      details: e?.response?.data || null
    });
  }
}