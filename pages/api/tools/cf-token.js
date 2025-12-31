import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class CaptchaSolver {
  constructor() {
    this.config = {
      v1: {
        baseUrl: this.decode("aHR0cHM6Ly9jZi5waXR1Y29kZS5jb20"),
        method: "POST",
        defaultPayload: (url, sitekey) => ({
          url: url,
          siteKey: sitekey,
          mode: "turnstile-min"
        }),
        extractToken: data => data?.token || data?.solution || data?.data
      },
      v2: {
        baseUrl: this.decode("aHR0cHM6Ly9hbmFib3QubXkuaWQvYXBpL3Rvb2xzL2J5cGFzcw"),
        method: "GET",
        defaultPayload: (url, sitekey, type = "turnstile-min", rest = {}) => ({
          url: url,
          siteKey: sitekey,
          type: type,
          apikey: "freeApikey",
          ...rest
        }),
        extractToken: data => data?.data?.result?.token
      },
      v3: {
        baseUrl: this.decode("aHR0cHM6Ly9hcGkucGF4c2VuaXgub3JnL3Rvb2xzLw"),
        method: "GET",
        endpoint: (act = "turnstile") => {
          const map = {
            turnstile: "cf-turnstile-solver",
            hcaptcha: "hcaptcha-invisible-solver",
            recaptchav3: "recaptchav3-invis-solver"
          };
          return map[act] || "cf-turnstile-solver";
        },
        defaultPayload: (url, sitekey) => ({
          url: url,
          sitekey: sitekey
        }),
        extractToken: data => data?.solution_token
      },
      v4: {
        baseUrl: this.decode("aHR0cHM6Ly90dXJzaXRlLnZlcmNlbC5hcHAvYnlwYXNz"),
        method: "POST",
        defaultPayload: (url, sitekey) => ({
          url: url,
          sitekey: sitekey
        }),
        extractToken: data => data?.token
      },
      v5: {
        baseUrl: `https://${apiConfig.DOMAIN_URL}/api/tools/captcha-solver`,
        method: "GET",
        defaultPayload: (url, sitekey) => ({
          url: url,
          sitekey: sitekey
        }),
        extractToken: data => data?.token
      }
    };
    this.bases = ["v1", "v2", "v3", "v4", "v5"];
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
  }
  _log(type, message) {
    const prefix = {
      info: "[INFO]",
      start: "[START]",
      success: "[SUCCESS]",
      fail: "[FAIL]",
      retry: "[RETRY]",
      error: "[ERROR]"
    } [type] || "[LOG]";
    console.log(`${prefix} ${message}`);
  }
  async _solveWithBase({
    url,
    sitekey,
    ver,
    act = "turnstile",
    type = "turnstile-min",
    ...rest
  }) {
    const cfg = this.config[ver];
    if (!cfg) {
      this._log("error", `Base tidak dikenal: ${ver}`);
      throw new Error(`Base tidak dikenal: ${ver}`);
    }
    this._log("start", `Mencoba (${ver}) → ${cfg.method} ${cfg.baseUrl}`);
    const startTime = Date.now();
    let apiUrl = cfg.baseUrl;
    try {
      if (cfg.endpoint) {
        const endpoint = cfg.endpoint(act);
        apiUrl += endpoint;
        this._log("info", `Endpoint: ${endpoint}`);
      }
      const payload = typeof cfg.defaultPayload === "function" ? cfg.defaultPayload(url, sitekey, type, rest) : {};
      this._log("info", `Payload: ${JSON.stringify(payload).slice(0, 200)}...`);
      const axiosCfg = {
        method: cfg.method,
        url: apiUrl,
        timeout: 3e4,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
          ...cfg.method === "POST" && {
            "Content-Type": "application/json"
          }
        }
      };
      if (cfg.method === "GET") axiosCfg.params = payload;
      else axiosCfg.data = payload;
      this._log("info", `Mengirim ${cfg.method} request...`);
      const response = await axios(axiosCfg);
      const elapsed = ((Date.now() - startTime) / 1e3).toFixed(2);
      this._log("info", `Respons diterima (${response.status}) dalam ${elapsed}s`);
      const token = cfg.extractToken(response.data);
      if (token) {
        this._log("success", `berhasil! Token ditemukan (${elapsed}s)`);
        return {
          token: token,
          ver: ver,
          act: type || act,
          elapsed: `${elapsed}s`
        };
      }
      const msg = response.data?.message || "Token tidak ditemukan";
      this._log("fail", `${msg}`);
      throw new Error(msg);
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1e3).toFixed(2);
      const status = error.response?.status;
      const data = error.response?.data;
      let errorMsg = error.message;
      if (status) {
        errorMsg = `HTTP ${status}`;
        if (data?.message) errorMsg += ` - ${data.message}`;
        else if (typeof data === "string") errorMsg += ` - ${data.slice(0, 100)}`;
      } else if (error.code === "ECONNABORTED") {
        errorMsg = "Timeout (30s)";
      } else if (error.code === "ERR_NETWORK") {
        errorMsg = "Koneksi gagal (network error)";
      }
      this._log("fail", `gagal [${elapsed}s]: ${errorMsg}`);
      throw new Error(`[${ver}]: ${errorMsg}`);
    }
  }
  async solve(params) {
    this._log("info", `Memulai proses solve captcha untuk: ${params.url}`);
    let lastError = null;
    let attempted = 0;
    for (const ver of this.bases) {
      attempted++;
      const cfg = this.config[ver];
      const isLast = attempted === this.bases.length;
      try {
        const result = await this._solveWithBase({
          ...params,
          ver: ver
        });
        this._log("success", `SOLVE BERHASIL dengan (${ver})`);
        return result;
      } catch (error) {
        lastError = error;
        if (!isLast) {
          this._log("retry", "Gagal, mencoba base berikutnya");
        } else {
          this._log("error", `SEMUA BASE GAGAL. Tidak ada fallback tersisa.`);
        }
      }
    }
    this._log("error", `GAGAL TOTAL: ${lastError.message}`);
    throw lastError;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.sitekey || !params.url) {
    return res.status(400).json({
      error: "sitekey and url are required."
    });
  }
  try {
    const solver = new CaptchaSolver();
    const result = await solver.solve(params);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error"
    });
  }
}