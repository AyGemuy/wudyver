import vm from "vm";
import axios from "axios";
class FastDL {
  constructor() {
    this.cache = null;
    this.src = "https://fastdl.app/js/link.chunk.js";
    this.mid = 7027;
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: "https://fastdl.app",
      referer: "https://fastdl.app/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async _initModules() {
    if (this.cache) return this.cache;
    console.log("[1/4] Mengambil script sumber dari FastDL...");
    try {
      const {
        data
      } = await axios.get(this.src);
      let js = data;
      js = js.split("WjkfYp[0x10])(k9vssNM(0x1e2),").join("WjkfYp[0x10])('https://fastdl.app'+k9vssNM(0x1e2),");
      js = js.split("throw new(ilxnw1X(k9vssNM(WjkfYp[0x23])+WjkfYp[0x15]))(k9vssNM(0x1d9)+k9vssNM(0x1da)+k9vssNM(0x1db)+k9vssNM(0x1dc))").join("");
      global.webpackChunk = [];
      global.self = global;
      global.window = global;
      global.location = {
        hostname: "fastdl.app"
      };
      console.log("[1/4] Mengeksekusi script dalam VM...");
      vm.runInThisContext(js);
      if (!global.webpackChunk[0]) throw new Error("Webpack chunk tidak ditemukan");
      this.cache = global.webpackChunk[0][1];
      return this.cache;
    } catch (e) {
      console.error("[Error Init] Gagal menyiapkan modul:", e.message);
      throw e;
    }
  }
  async _generateSignature(target) {
    console.log("[2/4] Menghasilkan signature untuk target...");
    try {
      const modules = await this._initModules();
      const cache = {};
      const req = id => {
        if (cache[id]) return cache[id].exports;
        const m = cache[id] = {
          exports: {}
        };
        if (!modules[id]) throw new Error(`Modul ID ${id} hilang (Obfuscation update?)`);
        modules[id](m, m.exports, req);
        return m.exports;
      };
      req.r = e => Object.defineProperty(e, "__esModule", {
        value: true
      });
      req.d = (e, d) => {
        for (const k in d) Object.defineProperty(e, k, {
          get: d[k]
        });
      };
      const signerFn = await req(this.mid).default;
      const signedBody = await signerFn(target);
      console.log("[2/4] Signature berhasil dibuat.");
      return signedBody;
    } catch (e) {
      console.error("[Error Sign] Gagal signing body:", e.message);
      throw e;
    }
  }
  clearCache() {
    try {
      console.log("[Cache] Membersihkan cache dan global variables...");
      this.cache = null;
      if (global.webpackChunk) {
        delete global.webpackChunk;
      }
      if (global.self && global.self === global) {
        delete global.self;
      }
      if (global.window && global.window === global) {
        delete global.window;
      }
      if (global.location) {
        delete global.location;
      }
      console.log("[Cache] Cache berhasil dibersihkan.");
    } catch (error) {
      console.error("[Cache] Gagal membersihkan cache:", error.message);
    }
  }
  async download({
    url
  }) {
    console.log(`\n=== Mulai Proses: ${url.substring(0, 30)}... ===`);
    const isUser = typeof url === "string" && !url.startsWith("http");
    const target = isUser ? {
      username: url
    } : url;
    const endpoint = isUser ? "https://api-wh.fastdl.app/api/v1/instagram/userInfo" : "https://api-wh.fastdl.app/api/convert";
    try {
      const signedBody = await this._generateSignature(target);
      console.log(`[3/4] Mengirim request ke API (${isUser ? "UserInfo" : "Convert"})...`);
      const config = {
        headers: {
          ...this.headers,
          "content-type": isUser ? "application/json" : "application/x-www-form-urlencoded;charset=UTF-8"
        }
      };
      const payload = isUser ? signedBody : new URLSearchParams(signedBody);
      const {
        data
      } = await axios.post(endpoint, payload, config);
      console.log("[4/4] Respons diterima dari server.");
      return data;
    } catch (e) {
      console.error("[Error Download] Terjadi kesalahan utama:", e.message);
      if (e.response) {
        console.error("Status Code:", e.response.status);
        console.error("Response Data:", JSON.stringify(e.response.data));
      }
      return null;
    } finally {
      this.clearCache();
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan",
      usage: {
        method: "GET or POST",
        params: {
          url: "Instagram URL or username (required)"
        },
        examples: {
          post: "?url=https://instagram.com/p/xxx",
          user: "?url=username"
        }
      }
    });
  }
  const api = new FastDL();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  } finally {
    try {
      api.clearCache();
    } catch (cleanupError) {
      console.error("[Handler] Gagal membersihkan cache:", cleanupError.message);
    }
  }
}