import axios from "axios";
class XBuddy {
  constructor() {
    this.cfg = {
      base: "https://ab.9xbud.com",
      home: "9xbuddy.site",
      ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      keys: {
        s1: "SORRY_MATE_IM_NOT_GONNA_TELL_YOU",
        s2: "jv7g2_DAMNN_DUDE",
        s3: "xbuddy123sudo-",
        dec: "SORRY_MATE"
      },
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        origin: "https://9xbuddy.site",
        referer: "https://9xbuddy.site/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-domain": "9xbuddy.site",
        "x-requested-with": "xmlhttprequest"
      }
    };
    this.state = {
      css: null,
      ver: null,
      token: null,
      uaHash: btoa(this.cfg.ua)
    };
  }
  _b64Dec(e) {
    e = e.replace(/\s/g, "");
    if (!/^[a-z0-9\+\/\s]+\={0,2}$/i.test(e) || e.length % 4 > 0) return "";
    let t, r, n = 0,
      s = [];
    e = e.replace(/=/g, "");
    while (n < e.length) {
      t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(e.charAt(n));
      switch (n % 4) {
        case 1:
          s.push(String.fromCharCode(r << 2 | t >> 4));
          break;
        case 2:
          s.push(String.fromCharCode((15 & r) << 4 | t >> 2));
          break;
        case 3:
          s.push(String.fromCharCode((3 & r) << 6 | t));
      }
      r = t;
      n++;
    }
    return s.join("");
  }
  _ord(e) {
    const r = e.charCodeAt(0);
    return r >= 55296 && r <= 56319 ? 1024 * (r - 55296) + (e.charCodeAt(1) - 56320) + 65536 : r;
  }
  _b64Enc(e) {
    let t, r, n, s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      a = 0,
      o = [];
    while (a < e.length) {
      t = e.charCodeAt(a);
      n = a % 3;
      switch (n) {
        case 0:
          o.push(s.charAt(t >> 2));
          break;
        case 1:
          o.push(s.charAt((3 & r) << 4 | t >> 4));
          break;
        case 2:
          o.push(s.charAt((15 & r) << 2 | t >> 6));
          o.push(s.charAt(63 & t));
      }
      r = t;
      a++;
    }
    if (n === 0) {
      o.push(s.charAt((3 & r) << 4));
      o.push("==");
    } else if (n === 1) {
      o.push(s.charAt((15 & r) << 2));
      o.push("=");
    }
    return o.join("");
  }
  _crypt(str, key, mode = "enc") {
    let res = "";
    if (mode === "dec") str = this._b64Dec(str);
    for (let n = 0; n < str.length; n++) {
      let s = str.substr(n, 1);
      let kVal = key.substr((n % key.length - 1 < 0 ? key.length : n % key.length) - 1, 1);
      s = Math.floor(mode === "enc" ? this._ord(s) + this._ord(kVal) : this._ord(s) - this._ord(kVal));
      res += String.fromCharCode(s);
    }
    return mode === "enc" ? this._b64Enc(res) : res;
  }
  _hex2bin(h) {
    const b = [];
    for (let i = 0; i < h.length; i += 2) b.push(parseInt(h.substr(i, 2), 16));
    return String.fromCharCode(...b);
  }
  async init() {
    if (this.state.css && this.state.ver) return;
    try {
      console.log("[INIT] Fetching keys...");
      const {
        data: html
      } = await axios.get(`https://${this.cfg.home}/`, {
        headers: {
          "User-Agent": this.cfg.ua
        }
      });
      const css = /\/build\/main\.([a-z0-9]+)\.css/.exec(html);
      const ver = /"appVersion"\s*:\s*"([^"]+)"/.exec(html);
      this.state.css = css ? css[1] : null;
      this.state.ver = ver ? ver[1] : "11.1.8";
      if (!this.state.css) throw new Error("CSS Hash not found");
    } catch (e) {
      console.error("[INIT] Error:", e.message);
      throw e;
    }
  }
  _genToken() {
    const a = this.state.css.split("").reverse().join("");
    const o = this.state.uaHash.split("").reverse().join("").substr(0, 10);
    const u = `${this.cfg.keys.s3}${this.state.ver}`;
    return this._crypt(this.cfg.home + a + o + this.cfg.keys.s1 + u + this.state.ver, a, "enc");
  }
  async _req(method, ep, data = {}, auth = true) {
    try {
      const h = {
        ...this.cfg.headers,
        "x-auth-token": this._genToken()
      };
      if (auth) {
        if (!this.state.token) {
          const t = await this._req("POST", "/token", {}, false);
          this.state.token = t.access_token;
        }
        h["x-access-token"] = this.state.token;
      } else {
        h["x-access-token"] = "false";
      }
      const res = await axios({
        method: method,
        url: `${this.cfg.base}${ep}`,
        headers: h,
        data: Object.keys(data).length ? data : undefined
      });
      return res.data;
    } catch (e) {
      if (e.response?.data?.message === "Invalid access token") {
        console.log("[API] Token refresh...");
        this.state.token = null;
        return this._req(method, ep, data, auth);
      }
      console.error(`[API] ${ep} Error:`, e.message);
      throw e;
    }
  }
  _fixJson(json) {
    try {
      const k = `${this.cfg.keys.dec}${this.cfg.home.length}${this.state.css}${json.response.token}`;
      if (json.response.formats) {
        json.response.formats = json.response.formats.map(v => {
          if (!/^http|\/\/|\/convert/.test(v.url)) {
            try {
              v.url = this._crypt(this._hex2bin(v.url).split("").reverse().join(""), k, "dec");
            } catch (e) {}
          }
          return v;
        });
      }
      return json;
    } catch (e) {
      return json;
    }
  }
  async info(url) {
    const encUrl = encodeURIComponent(url);
    const sig = this._crypt(encUrl, this._genToken() + this.cfg.keys.s2, "enc");
    const res = await this._req("POST", "/extract", {
      url: encUrl,
      _sig: sig,
      searchEngine: "yt"
    });
    if (res.status === false) throw new Error(res.message || "Extract Failed");
    return this._fixJson(res);
  }
  async _pick(formats, qual, convert) {
    let vids = formats.filter(f => f.type === "video");
    if (!vids.length) vids = formats;
    if (!convert) {
      console.log("[PICK] Filtering Direct HTTPS links only...");
      const direct = vids.filter(v => v.url && v.url.startsWith("https"));
      if (direct.length > 0) vids = direct;
      else console.warn("[PICK] No direct HTTPS links found! Falling back to raw list.");
    }
    let sel = vids[0];
    if (qual) {
      if (!isNaN(qual) && vids[parseInt(qual)]) sel = vids[parseInt(qual)];
      else {
        const byName = vids.find(v => v.quality === qual);
        if (byName) sel = byName;
      }
    }
    if (!sel) throw new Error("Format selection failed");
    console.log(`[PICK] Selected: ${sel.quality} | Type: ${sel.type} | URL starts: ${sel.url.substr(0, 15)}...`);
    return sel;
  }
  async _resolve(rawUrl) {
    let u = rawUrl;
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) u = this.cfg.base + u;
    if (u.includes("/convert/")) {
      console.log("[RESOLVE] Processing server-side conversion...");
      const [, , uid, param] = u.split("/");
      const parts = u.split("/convert/")[1].split("/");
      await this._req("POST", "/convert", {
        uid: parts[0],
        url: parts[1]
      });
      for (let i = 0; i < 60; i++) {
        const p = await this._req("POST", "/progress", {
          uid: parts[0]
        });
        if (p.response?.url) return p.response.url;
        await new Promise(r => setTimeout(r, 3e3));
      }
      throw new Error("Conversion Timeout");
    }
    return u;
  }
  async download({
    url,
    quality,
    convert = false,
    output = "url"
  }) {
    try {
      console.log(`\n[EXEC] Start: ${url} (Conv: ${convert})`);
      await this.init();
      const raw = await this.info(url);
      if (!raw.response?.formats) throw new Error("No formats");
      const sel = await this._pick(raw.response.formats, quality, convert);
      if (!convert) {
        console.log("[EXEC] Returning RAW result (Convert False)");
        return {
          success: true,
          selected: sel,
          ...raw.response
        };
      }
      const finalUrl = await this._resolve(sel.url);
      if (output === "url") {
        return {
          success: true,
          selected_format: sel.quality,
          url: finalUrl
        };
      }
      console.log("[EXEC] Downloading Content...");
      const {
        data: buf
      } = await axios.get(finalUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": this.cfg.ua
        }
      });
      const b = Buffer.from(buf);
      return {
        success: true,
        selected_format: sel.quality,
        size: `${(b.length / 1024 / 1024).toFixed(2)} MB`,
        base64: output === "base64" ? b.toString("base64") : undefined,
        buffer: output === "buffer" ? b : undefined
      };
    } catch (e) {
      console.error("[EXEC FAIL]", e.message);
      if (e.response?.data) console.error("API Raw:", JSON.stringify(e.response.data));
      return {
        success: false,
        error: e.message
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
  const api = new XBuddy();
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