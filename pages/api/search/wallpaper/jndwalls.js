import axios from "axios";
class WallArtClient {
  constructor() {
    this.cfg = {
      url: "https://jndwalls.in/Arrow/WallArt/public/api",
      headers: {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      },
      modes: {
        premium: {
          ep: "/primwallpaper",
          req: []
        },
        featured: {
          ep: "/Allwallpaper",
          req: []
        },
        free: {
          ep: "/freewallpaper",
          req: []
        },
        category: {
          ep: "/category",
          req: []
        },
        search: {
          ep: "/searchwall",
          req: ["tags"]
        },
        desk_wall: {
          ep: "/desk-categories/wallpapers",
          req: ["desk_cat_id"]
        },
        desk_random: {
          ep: "/desk-categories/Randomwalls",
          req: ["desk_cat_id"]
        }
      },
      def: {
        page: 1,
        auth: "Bearer nouser",
        featured: 0
      }
    };
  }
  fmt(obj) {
    if (Array.isArray(obj)) return obj.map(v => this.fmt(v));
    if (obj !== null && typeof obj === "object") {
      return Object.entries(obj).reduce((acc, [k, v]) => {
        const key = k.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
        let val = v;
        if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
          try {
            val = JSON.parse(v);
          } catch {
            val = v;
          }
        }
        acc[key] = this.fmt(val);
        return acc;
      }, {});
    }
    return obj;
  }
  vld(m, inp) {
    const availableModes = Object.keys(this.cfg.modes);
    const target = this.cfg.modes?.[m];
    if (!target) {
      return {
        ok: false,
        msg: `Mode '${m}' tidak ditemukan`,
        allowed_modes: availableModes
      };
    }
    const missing = target.req?.filter(k => !inp[k]) || [];
    if (missing.length > 0) {
      return {
        ok: false,
        msg: `Parameter wajib tidak lengkap`,
        required_fields: target.req,
        missing_fields: missing
      };
    }
    return {
      ok: true,
      setup: target
    };
  }
  async run({
    mode,
    ...rest
  }) {
    try {
      const m = mode || "free";
      const check = this.vld(m, rest);
      if (!check.ok) {
        return {
          status: false,
          error_type: "VALIDATION_ERROR",
          ...check,
          result: []
        };
      }
      const headers = {
        ...this.cfg.headers,
        Authorization: rest.auth || this.cfg.def.auth
      };
      const params = {
        ...this.cfg.def,
        ...rest
      };
      delete params.auth;
      console.log(`[PROSES] Req: ${m} | EP: ${check.setup.ep} | Param: ${JSON.stringify(params)}`);
      const res = await axios({
        method: "GET",
        baseURL: this.cfg.url,
        url: check.setup.ep,
        headers: headers,
        params: params,
        timeout: 15e3
      });
      console.log(res.data);
      const clean = this.fmt(res.data);
      const resultData = clean.wallpaper || clean.categories || clean.randomwalls || [];
      const {
        wallpaper,
        categories,
        randomwalls,
        ...info
      } = clean;
      return {
        status: true,
        message: "Success",
        result: resultData,
        ...info
      };
    } catch (err) {
      console.error(`[ERROR] ${err.message}`);
      return {
        status: false,
        message: err.response?.data?.message || err.message,
        result: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new WallArtClient();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}