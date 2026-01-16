import vm from "vm";
import fetch from "node-fetch";
class InstaDl {
  constructor(hostName = "fastdl") {
    this.hosts = [{
      name: "fastdl",
      base: "https://fastdl.app",
      api: "https://api-wh.fastdl.app",
      src: "https://fastdl.app/js/link.chunk.js",
      mid: 7027,
      convert: "/api/convert",
      userInfo: "/api/v1/instagram/userInfo",
      patcher: js => {
        js = js.split("WjkfYp[0x10])(k9vssNM(0x1e2),").join("WjkfYp[0x10])('https://fastdl.app'+k9vssNM(0x1e2),");
        js = js.split("throw new(ilxnw1X(k9vssNM(WjkfYp[0x23])+WjkfYp[0x15]))(k9vssNM(0x1d9)+k9vssNM(0x1da)+k9vssNM(0x1db)+k9vssNM(0x1dc))").join("");
        return js;
      }
    }, {
      name: "anonyig",
      base: "https://anonyig.com",
      api: null,
      src: "https://anonyig.com/js/link.chunk.js",
      mid: 7027,
      convert: "/api/convert",
      userInfo: "/api/v1/instagram/userInfo",
      patcher: js => {
        js = js.split("yEKhXW[0x15])(bgVI0Ri(0x222),").join("yEKhXW[0x15])('https://anonyig.com'+bgVI0Ri(0x222),");
        js = js.split("throw new(qZpiz_1(bgVI0Ri(yEKhXW[0x26])))(bgVI0Ri(0x218)+bgVI0Ri(0x219)+bgVI0Ri(0x21a)+bgVI0Ri(0x21b)+bgVI0Ri(0x21c)+yEKhXW[0x54])").join("");
        return js;
      }
    }, {
      name: "storiesig",
      base: "https://storiesig.info",
      api: "https://api-wh.storiesig.info",
      src: "https://storiesig.info/js/link.chunk.js",
      mid: 508,
      convert: "/api/convert",
      userInfo: "/api/v1/instagram/userInfo",
      patcher: js => {
        js = js.split("ePePo6u(rIIxMK0(SagBGRn[0x147])+SagBGRn[0x148])(rIIxMK0(0x21a),").join("ePePo6u(rIIxMK0(SagBGRn[0x147])+SagBGRn[0x148])('https://storiesig.info'+rIIxMK0(0x21a),");
        js = js.split("throw new(ePePo6u(rIIxMK0(SagBGRn[0x22])+SagBGRn[0x23]))(rIIxMK0(0x211)+rIIxMK0(0x212)+rIIxMK0(0x213)+rIIxMK0(0x214)+rIIxMK0(0x215)+SagBGRn[0x11])").join("");
        return js;
      }
    }, {
      name: "igram",
      base: "https://igram.world",
      api: "https://api-wh.igram.world",
      src: "https://igram.world/js/link.chunk.js",
      mid: 3508,
      convert: "/api/convert",
      userInfo: "/api/v1/instagram/userInfo",
      patcher: js => {
        js = js.split("(nDLP6H(0x1f6),").join("('https://igram.world'+nDLP6H(0x1f6),");
        js = js.split("throw new(Dol0Ew(nDLP6H(O6TR74[0x1e])))(nDLP6H(0x1ee)+nDLP6H(0x1ef)+nDLP6H(0x1f0)+O6TR74[0x24]);").join("O_1ei8j[nDLP6H(O6TR74[0x75])]=O6TR74[0xa];break;");
        js = js.split("throw new(Dol0Ew(nDLP6H(O6TR74[0x1e])))(nDLP6H(0x1f1)+nDLP6H(0x1f2)+nDLP6H(0x1f3)+nDLP6H(0x1f4));").join("O_1ei8j[nDLP6H(O6TR74[0x75])]=O6TR74[0x33];break;");
        return js;
      }
    }, {
      name: "sssinstagram",
      base: "https://sssinstagram.com",
      api: "https://api-wh.sssinstagram.com",
      src: "https://sssinstagram.com/js/link.chunk.js",
      mid: 7027,
      convert: "/api/convert",
      userInfo: "/api/v1/instagram/userInfo",
      patcher: js => {
        js = js.split("(Q4YjQI(0x216),").join("('https://sssinstagram.com'+Q4YjQI(0x216),");
        js = js.split("throw new(cPLY5L(Q4YjQI(AH6pOo[0x2b])+AH6pOo[0x1e]))(Q4YjQI(0x20e)+Q4YjQI(0x20f)+Q4YjQI(0x210)+AH6pOo[0x1e]);").join("u5HZsy[Q4YjQI(AH6pOo[0x59])]=AH6pOo[0xa];break;");
        js = js.split("throw new(cPLY5L(Q4YjQI(AH6pOo[0x2b])+AH6pOo[0x1e]))(Q4YjQI(0x211)+Q4YjQI(0x212)+Q4YjQI(0x213)+Q4YjQI(0x214));").join("u5HZsy[Q4YjQI(AH6pOo[0x59])]=AH6pOo[0x3e];break;");
        return js;
      }
    }, {
      name: "instasupersave",
      base: "https://instasupersave.com",
      api: null,
      src: "https://instasupersave.com/js/link.chunk.js",
      mid: 3508,
      convert: "/api/convert",
      userInfo: "/api/v1/instagram/userInfo",
      patcher: js => {
        js = js.split("(gmOEz6(0x20d),").join("('https://instasupersave.com'+gmOEz6(0x20d),");
        js = js.split("throw new(Y0arTQ(gmOEz6(OQaFNG[0x1b])+OQaFNG[0x1c]))(gmOEz6(0x203)+gmOEz6(0x204)+gmOEz6(0x205)+gmOEz6(0x206)+gmOEz6(0x207)+OQaFNG[0x25]);").join("ZZteo99[gmOEz6(OQaFNG[0x7e])]=OQaFNG[0xa];break;");
        js = js.split("&&KA8zVh()){").join("&&true){");
        return js;
      }
    }];
    this.cachedModules = null;
    this.setHost(hostName);
  }
  setHost(hostName) {
    const host = this.hosts.find(h => h.name === hostName);
    if (!host) {
      throw new Error(`Host "${hostName}" tidak ditemukan. Available hosts: ${this.hosts.map(h => h.name).join(", ")}`);
    }
    this.currentHost = host;
    this.cachedModules = null;
    return this;
  }
  getAvailableHosts() {
    return this.hosts.map(h => h.name);
  }
  async getModules() {
    if (this.cachedModules) return this.cachedModules;
    const {
      src,
      patcher
    } = this.currentHost;
    let js = await fetch(src).then(r => r.text());
    js = patcher(js);
    global.webpackChunk = [];
    global.self = global;
    vm.runInThisContext(js);
    this.cachedModules = global.webpackChunk[0][1];
    return this.cachedModules;
  }
  async generateSignedBody(targetUrl) {
    const modules = await this.getModules();
    console.log(modules);
    const {
      mid
    } = this.currentHost;
    if (!mid) {
      throw new Error(`Module ID tidak tersedia untuk host "${this.currentHost.name}"`);
    }
    const cache = {};

    function o(id) {
      if (cache[id]) return cache[id].exports;
      const m = cache[id] = {
        exports: {}
      };
      modules[id](m, m.exports, o);
      return m.exports;
    }
    o.r = e => Object.defineProperty(e, "__esModule", {
      value: true
    });
    o.d = (e, d) => {
      for (const k in d) {
        if (!Object.prototype.hasOwnProperty.call(e, k)) {
          Object.defineProperty(e, k, {
            enumerable: true,
            get: d[k]
          });
        }
      }
    };
    const mod = o(mid);
    const fn = await mod.default;
    return fn(targetUrl);
  }
  async download({
    url,
    host
  }) {
    try {
      console.log(`[Download] Memulai proses untuk: ${url} pada host: ${host}`);
      this.setHost(host);
      const {
        base,
        api,
        convert,
        userInfo
      } = this.currentHost;
      const apiBase = api || base;
      if (typeof url === "string" && !url.startsWith("https://")) {
        url = {
          username: url
        };
      }
      const signed = await this.generateSignedBody(url);
      const isUserInfoEndpoint = url?.username;
      const endpoint = `${apiBase}${isUserInfoEndpoint ? userInfo : convert}`;
      console.log(`[Download] Request ke endpoint: ${endpoint}`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": isUserInfoEndpoint ? "application/json" : "application/x-www-form-urlencoded;charset=utf-8",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          Referer: `${base}/`,
          Origin: base
        },
        body: isUserInfoEndpoint ? JSON.stringify(signed) : new URLSearchParams(signed)
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const result = await res.json();
      console.log("[Download] Berhasil mendapatkan data.");
      return result;
    } catch (error) {
      console.error("[Download] Gagal:", error.message);
      return {
        success: false,
        message: error.message
      };
    } finally {
      this.clearCache();
    }
  }
  clearCache() {
    try {
      console.log("[Cache] Membersihkan cache...");
      this.cachedModules = null;
      if (global.webpackChunk) {
        delete global.webpackChunk;
      }
      if (global.self && global.self === global) {
        delete global.self;
      }
      console.log("[Cache] Cache berhasil dibersihkan.");
    } catch (error) {
      console.error("[Cache] Gagal membersihkan cache:", error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    host = "0",
    ...params
  } = req.method === "POST" ? req.body : req.query;
  console.log(`\n[API HANDLER] ${req.method} /api/download`);
  console.log(`[API HANDLER] Params: url=${url || "MISSING"}, host=${host}`);
  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL parameter is required",
      usage: {
        method: "GET or POST",
        params: {
          url: "Instagram URL (required)",
          host: "Host name or index 0-5 (optional, default: 0 or 'fastdl')"
        },
        examples: {
          byIndex: "?url=https://instagram.com/p/xxx&host=0",
          byName: "?url=https://instagram.com/p/xxx&host=fastdl"
        }
      }
    });
  }
  const dl = new InstaDl();
  try {
    let selectedHostName;
    const hostAsNumber = parseInt(host);
    if (!isNaN(hostAsNumber)) {
      if (hostAsNumber < 0 || hostAsNumber >= dl.hosts.length) {
        const errorMsg = `Host index must be between 0-${dl.hosts.length - 1}`;
        console.error(`[API HANDLER] 400 - ${errorMsg}`);
        return res.status(400).json({
          success: false,
          error: errorMsg,
          availableHosts: dl.hosts.map((h, i) => ({
            index: i,
            name: h.name
          }))
        });
      }
      selectedHostName = dl.hosts[hostAsNumber].name;
    } else {
      const hostFound = dl.hosts.find(h => h.name.toLowerCase() === host.toLowerCase());
      if (!hostFound) {
        const errorMsg = `Host "${host}" not found`;
        console.error(`[API HANDLER] 400 - ${errorMsg}`);
        return res.status(400).json({
          success: false,
          error: errorMsg,
          availableHosts: dl.hosts.map((h, i) => ({
            index: i,
            name: h.name
          }))
        });
      }
      selectedHostName = hostFound.name;
    }
    console.log(`[API HANDLER] Using host: ${selectedHostName}`);
    const result = await dl.download({
      url: url,
      host: selectedHostName,
      ...params
    });
    console.log("[API HANDLER] 200 - Success sending response.");
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API HANDLER] 500 - Request Failed:`, e.message);
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || e?.message || "Internal server error";
    return res.status(status).json({
      success: false,
      error: msg
    });
  } finally {
    try {
      dl.clearCache();
    } catch (cleanupError) {
      console.error("[API HANDLER] Gagal membersihkan cache:", cleanupError.message);
    }
  }
}