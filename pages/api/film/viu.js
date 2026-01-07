import axios from "axios";
import crypto from "crypto";
import qs from "qs";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class ViuApi {
  constructor() {
    this.base = `${proxy}https://api-gateway-global.viu.com`;
    this.token = null;
    this.deviceId = null;
    this.cfg = {
      platform: "android",
      lang: "8",
      area: "1000",
      os: "2",
      cc: "ID",
      label: "phone",
      ut: "0"
    };
    this.axios = axios.create({
      timeout: 3e4,
      validateStatus: status => status < 500
    });
  }
  id() {
    return crypto.randomBytes(16).toString("hex").slice(0, 16);
  }
  h(m = "GET", u = "", d = null, auth = false) {
    const h = {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      platform: this.cfg.platform
    };
    if (auth && this.token) h.authorization = `Bearer ${this.token}`;
    if (d) h["Content-Type"] = "application/x-www-form-urlencoded";
    return {
      method: m,
      url: u,
      headers: h,
      ...d && {
        data: d
      }
    };
  }
  async req(cfg) {
    try {
      console.log(`[${cfg.method}] ${cfg.url}`);
      const {
        data
      } = await this.axios.request(cfg);
      console.log(`✓ Success`);
      let result = null;
      if (data && typeof data === "object") {
        if (data.data !== undefined) {
          result = data.data;
        } else {
          result = data;
        }
      }
      return result;
    } catch (e) {
      console.log(`✗ Error: ${e?.response?.status || ""} ${e?.message || e}`);
      return null;
    }
  }
  async env() {
    try {
      const u = `${this.base}/api/mobile?r=%2Fenv%2Finfo&platform_flag_label=${this.cfg.label}&language_flag_id=${this.cfg.lang}&ut=0&area_id=-1&os_flag_id=${this.cfg.os}&countryCode=`;
      return await this.req(this.h("GET", u));
    } catch (e) {
      console.log(`env error: ${e?.message || e}`);
      return null;
    }
  }
  async device() {
    try {
      const d = qs.stringify({
        id1: this.id(),
        id2: this.id(),
        platform: this.cfg.platform
      });
      const u = `${this.base}/api/user/device?platform_flag_label=${this.cfg.label}&language_flag_id=${this.cfg.lang}&ut=0&area_id=${this.cfg.area}&os_flag_id=${this.cfg.os}&countryCode=${this.cfg.cc}`;
      const res = await this.req(this.h("POST", u, d));
      if (res && res.deviceId) {
        this.deviceId = res.deviceId;
        console.log(`Device ID: ${this.deviceId}`);
      }
      return res;
    } catch (e) {
      console.log(`device error: ${e?.message || e}`);
      return null;
    }
  }
  async config() {
    try {
      const u = `${this.base}/api/config`;
      return await this.req(this.h("GET", u));
    } catch (e) {
      console.log(`config error: ${e?.message || e}`);
      return null;
    }
  }
  async auth({
    msisdn,
    appVersion,
    buildVersion,
    ...rest
  } = {}) {
    try {
      const cf = await this.config();
      const d = qs.stringify({
        countryCode: this.cfg.cc,
        platform: this.cfg.platform,
        platformFlagLabel: this.cfg.label,
        language: this.cfg.lang,
        deviceId: this.deviceId || this.id(),
        dataTrackingDeviceId: this.id(),
        osVersion: "35",
        appVersion: appVersion || this.id(),
        buildVersion: buildVersion || this.id(),
        carrierId: cf?.carrier?.id || "72",
        carrierName: cf?.carrier?.name || "Telkomsel",
        appBundleId: "com.vuclip.viu",
        vuclipUserId: "",
        deviceBrand: "realme",
        deviceModel: "RMX3890",
        flavour: "all",
        msisdn: msisdn || this.id(),
        ...rest
      });
      const u = `${this.base}/api/auth/token`;
      const res = await this.req(this.h("POST", u, d));
      if (res && res.token) {
        this.token = res.token;
        console.log(`Token: ${this.token?.slice(0, 50)}...`);
      }
      return res;
    } catch (e) {
      console.log(`auth error: ${e?.message || e}`);
      return null;
    }
  }
  async ensureToken({
    token,
    ...rest
  }) {
    try {
      if (token) {
        this.token = token;
        return;
      }
      if (!this.token) {
        console.log("Auto auth...");
        await this.device();
        await this.auth(rest);
      }
    } catch (e) {
      console.log(`ensureToken error: ${e?.message || e}`);
    }
  }
  q(r, p = {}) {
    const def = {
      platform_flag_label: this.cfg.label,
      language_flag_id: this.cfg.lang,
      ut: "0",
      area_id: this.cfg.area,
      os_flag_id: this.cfg.os,
      countryCode: this.cfg.cc
    };
    return `${this.base}/api/mobile?r=${encodeURIComponent(r)}&${qs.stringify({
...def,
...p
})}`;
  }
  wrapResponse(result) {
    if (!result) return null;
    return {
      ...result,
      token: this.token
    };
  }
  async home({
    token,
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/home/index"), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`home error: ${e?.message || e}`);
      return null;
    }
  }
  async live({
    token,
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/live/list"), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`live error: ${e?.message || e}`);
      return null;
    }
  }
  async categories({
    token,
    os = "Android",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/category/list", {
        os: os
      }), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`categories error: ${e?.message || e}`);
      return null;
    }
  }
  async series({
    token,
    category_id = "579",
    tag_id = "0",
    release_time = "0",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/category/series", {
        category_id: category_id,
        tag_id: tag_id,
        release_time: release_time
      }), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`series error: ${e?.message || e}`);
      return null;
    }
  }
  async search({
    token,
    keyword = "",
    limit = 18,
    page = 1,
    has_micro_drama = 1,
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/search/video", {
        limit: limit,
        page: page,
        has_micro_drama: has_micro_drama,
        "keyword[]": keyword
      }), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`search error: ${e?.message || e}`);
      return null;
    }
  }
  async predict({
    token,
    keyword = "",
    has_micro_drama = 1,
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/search/prediction", {
        keyword: keyword,
        has_micro_drama: has_micro_drama
      }), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`predict error: ${e?.message || e}`);
      return null;
    }
  }
  async detail({
    token,
    product_id = "",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/vod/detail", {
        product_id: product_id
      }), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`detail error: ${e?.message || e}`);
      return null;
    }
  }
  async episodes({
    token,
    product_id = "",
    series_id = "",
    size = 1e3,
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const result = await this.req(this.h("GET", this.q("/vod/product-list", {
        product_id: product_id,
        series_id: series_id,
        size: size
      }), null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`episodes error: ${e?.message || e}`);
      return null;
    }
  }
  async play({
    token,
    ccs_product_id = "",
    ...rest
  } = {}) {
    try {
      await this.ensureToken({
        token: token,
        ...rest
      });
      const u = `${this.base}/api/playback/distribute?${qs.stringify({
ccs_product_id: ccs_product_id,
platform_flag_label: this.cfg.label,
language_flag_id: this.cfg.lang,
ut: this.cfg.ut,
area_id: this.cfg.area,
os_flag_id: this.cfg.os,
countryCode: this.cfg.cc
})}`;
      const result = await this.req(this.h("GET", u, null, true));
      return this.wrapResponse(result);
    } catch (e) {
      console.log(`play error: ${e?.message || e}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["env", "config", "home", "live", "categories", "series", "search", "predict", "detail", "episodes", "play"]
    });
  }
  const api = new ViuApi();
  try {
    let response;
    switch (action) {
      case "env":
        response = await api.env();
        break;
      case "config":
        response = await api.config();
        break;
      case "home":
        response = await api.home(params);
        break;
      case "live":
        response = await api.live(params);
        break;
      case "categories":
        response = await api.categories(params);
        break;
      case "series":
        if (!params.category_id) {
          return res.status(400).json({
            error: "Parameter 'category_id' wajib diisi untuk action 'series'."
          });
        }
        response = await api.series(params);
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            error: "Parameter 'keyword' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "predict":
        if (!params.keyword) {
          return res.status(400).json({
            error: "Parameter 'keyword' wajib diisi untuk action 'predict'."
          });
        }
        response = await api.predict(params);
        break;
      case "detail":
        if (!params.product_id) {
          return res.status(400).json({
            error: "Parameter 'product_id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "episodes":
        if (!params.product_id || !params.series_id) {
          return res.status(400).json({
            error: "Parameter 'product_id' dan 'series_id' wajib diisi untuk action 'episodes'."
          });
        }
        response = await api.episodes(params);
        break;
      case "play":
        if (!params.ccs_product_id) {
          return res.status(400).json({
            error: "Parameter 'ccs_product_id' wajib diisi untuk action 'play'."
          });
        }
        response = await api.play(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["env", "config", "home", "live", "categories", "series", "search", "predict", "detail", "episodes", "play"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}