import axios from "axios";
import crypto from "crypto";
const FIREBASE_API_KEY = "AIzaSyDp1cPCaSExjZLL1JSXdpsqsJg4Lm1ymYo";
class ShorticalApi {
  constructor() {
    this.cfg = {
      base_url: "https://prod.shortical.com",
      firebase_url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
      endpoints: {
        claims: "/api/v1/users/claims",
        link_account: "/api/v1/users/link-account",
        token: "/api/v1/users/token",
        series: "/api/v1/series",
        more_rec_v1: "/api/v1/series/more-recommended",
        more_rec_v2: "/api/v2/series/more-recommended",
        top_recs: "/api/v1/series/top-recommendations",
        hero: "/api/v1/series/hero",
        series_detail: id => `/api/v1/series/${id}`,
        episodes: id => `/api/v1/series/${id}/episodes`,
        episode_watch: (sid, ep) => `/api/v1/series/${sid}/episodes/${ep}/watch`,
        episode_url: (sid, ep) => `/api/v1/series/${sid}/episodes/${ep}/url`,
        reward_grant: label => `/api/v1/rewards/${label}/grant`,
        reward_label: label => `/api/v1/rewards/${label}`,
        unlock_episode: "/api/v1/rewards/unlock-episode",
        general_rewards: "/api/v1/rewards/general",
        check_in: "/api/v1/rewards/check-in"
      }
    };
    this.token = null;
    this.device_id = null;
  }
  _validate(params, required_keys = []) {
    const missing = required_keys.filter(key => {
      const val = params[key];
      return val === undefined || val === null || val === "";
    });
    if (missing.length > 0) {
      throw new Error(`Parameter wajib hilang: ${missing.join(", ")}`);
    }
  }
  _rand(length = 16) {
    return crypto.randomBytes(length / 2).toString("hex");
  }
  async _token(ctoken) {
    try {
      const res = await axios.post(this.cfg.firebase_url, {
        token: ctoken,
        returnSecureToken: true
      });
      return res.data.idToken;
    } catch (error) {
      throw new Error(`Firebase Exchange Failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
  async _request({
    method,
    url,
    data = null,
    params = null,
    token = null,
    ensure_auth = true
  }) {
    if (ensure_auth && !token && !this.token) {
      console.log("⚠ [System] Token kosong, memulai proses Auto-Login...");
      await this.login({});
    }
    const active_token = token || this.token;
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "okhttp/4.9.0",
      ...active_token ? {
        Authorization: `Bearer ${active_token}`
      } : {}
    };
    try {
      const response = await axios({
        baseURL: this.cfg.base_url,
        method: method,
        url: url,
        data: data,
        params: params,
        headers: headers
      });
      return {
        ...response.data,
        token: active_token
      };
    } catch (error) {
      throw error;
    }
  }
  async login({
    device_id = null,
    is_recovery = false,
    token = null
  } = {}) {
    if (token) {
      this.token = token;
      return token;
    }
    try {
      const final_device_id = device_id || this._rand(16);
      this.device_id = final_device_id;
      console.log(`➤ [Auth] Memulai login untuk Device ID: ${final_device_id}`);
      const payload = {
        field1: is_recovery ? final_device_id : null,
        field2: final_device_id
      };
      const backend_res = await this._request({
        method: "POST",
        url: this.cfg.endpoints.token,
        data: payload,
        ensure_auth: false
      });
      const ctoken = backend_res?.token || backend_res;
      if (!ctoken || typeof ctoken !== "string") {
        throw new Error("Respon backend tidak valid (Custom Token hilang)");
      }
      const id_token = await this._token(ctoken);
      this.token = id_token;
      console.log("✔ [Auth] Login Berhasil.");
      try {
        await this.check_in();
        console.log("✔ [Auto] Check-in harian selesai.");
      } catch (err) {}
      return this.token;
    } catch (error) {
      console.error(`✖ [Auth Error] Proses login gagal: ${error.message}`);
      throw error;
    }
  }
  async get_claims({
    token
  } = {}) {
    try {
      console.log("➤ [User] Mengambil data Claims/Wallet...");
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.claims,
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil claims: ${error.message}`);
      throw error;
    }
  }
  async link_account({
    provider_token,
    type = "google",
    token
  } = {}) {
    try {
      this._validate({
        provider_token: provider_token
      }, ["provider_token"]);
      console.log(`➤ [User] Menghubungkan akun (${type})...`);
      return await this._request({
        method: "POST",
        url: this.cfg.endpoints.link_account,
        data: {
          token: provider_token,
          type: type
        },
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal link account: ${error.message}`);
      throw error;
    }
  }
  async series({
    page = 1,
    category = null,
    token
  } = {}) {
    try {
      console.log(`➤ [Series] Mengambil list (Page: ${page})...`);
      const params = {
        page: page
      };
      if (category) params.category = category;
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.series,
        params: params,
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil list series: ${error.message}`);
      throw error;
    }
  }
  async recommend({
    version = 2,
    page = 1,
    token
  } = {}) {
    try {
      const endpoint = version === 1 ? this.cfg.endpoints.more_rec_v1 : this.cfg.endpoints.more_rec_v2;
      console.log(`➤ [Series] Mengambil Rekomendasi (v${version})...`);
      return await this._request({
        method: "GET",
        url: endpoint,
        params: {
          page: page
        },
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil rekomendasi: ${error.message}`);
      throw error;
    }
  }
  async top_recommendations({
    token
  } = {}) {
    try {
      console.log("➤ [Series] Mengambil Top Recommendations...");
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.top_recs,
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil top recs: ${error.message}`);
      throw error;
    }
  }
  async hero_series({
    token
  } = {}) {
    try {
      console.log("➤ [Series] Mengambil data Hero/Banner...");
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.hero,
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil Hero Series: ${error.message}`);
      throw error;
    }
  }
  async series_detail({
    series_id,
    token
  } = {}) {
    try {
      this._validate({
        series_id: series_id
      }, ["series_id"]);
      console.log(`➤ [Detail] Mengambil info Series ID: ${series_id}...`);
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.series_detail(series_id),
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil detail: ${error.message}`);
      throw error;
    }
  }
  async episodes({
    series_id,
    token
  } = {}) {
    try {
      this._validate({
        series_id: series_id
      }, ["series_id"]);
      console.log(`➤ [Detail] Mengambil daftar episode Series ID: ${series_id}...`);
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.episodes(series_id),
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil episodes: ${error.message}`);
      throw error;
    }
  }
  async episode_url({
    series_id,
    episode_number,
    token
  } = {}) {
    try {
      this._validate({
        series_id: series_id,
        episode_number: episode_number
      }, ["series_id", "episode_number"]);
      console.log(`➤ [Stream] Mengambil URL (S${series_id}-E${episode_number})...`);
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.episode_url(series_id, episode_number),
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil URL Episode: ${error.message}`);
      throw error;
    }
  }
  async update_watch({
    series_id,
    episode_number,
    progress = 100,
    token
  } = {}) {
    try {
      this._validate({
        series_id: series_id,
        episode_number: episode_number
      }, ["series_id", "episode_number"]);
      console.log(`➤ [Stream] Update progress (S${series_id}-E${episode_number})...`);
      return await this._request({
        method: "POST",
        url: this.cfg.endpoints.episode_watch(series_id, episode_number),
        data: {
          progress: progress
        },
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal update progress: ${error.message}`);
      throw error;
    }
  }
  async check_in({
    token
  } = {}) {
    try {
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.check_in,
        token: token
      });
    } catch (error) {
      throw error;
    }
  }
  async rewards_list({
    token
  } = {}) {
    try {
      console.log("➤ [Reward] Mengambil List General Rewards...");
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.general_rewards,
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil rewards list: ${error.message}`);
      throw error;
    }
  }
  async reward_detail({
    label,
    token
  } = {}) {
    try {
      this._validate({
        label: label
      }, ["label"]);
      console.log(`➤ [Reward] Mengambil info reward: ${label}...`);
      return await this._request({
        method: "GET",
        url: this.cfg.endpoints.reward_label(label),
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal ambil detail reward: ${error.message}`);
      throw error;
    }
  }
  async grant_reward({
    label,
    token
  } = {}) {
    try {
      this._validate({
        label: label
      }, ["label"]);
      console.log(`➤ [Reward] Claim Reward: ${label}...`);
      return await this._request({
        method: "POST",
        url: this.cfg.endpoints.reward_grant(label),
        data: {},
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal claim reward: ${error.message}`);
      throw error;
    }
  }
  async unlock_episode({
    series_id,
    episode_number,
    token
  } = {}) {
    try {
      this._validate({
        series_id: series_id,
        episode_number: episode_number
      }, ["series_id", "episode_number"]);
      console.log(`➤ [Reward] Membuka Episode (Unlock) S${series_id}-E${episode_number}...`);
      return await this._request({
        method: "POST",
        url: this.cfg.endpoints.unlock_episode,
        data: {
          series_id: series_id,
          episode_number: episode_number
        },
        token: token
      });
    } catch (error) {
      console.error(`✖ [Error] Gagal unlock episode: ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["login", "claims", "link", "series", "recommend", "top_recs", "hero", "detail", "episodes", "stream", "progress", "check_in", "rewards", "reward_detail", "grant_reward", "unlock"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: validActions
    });
  }
  const api = new ShorticalApi();
  try {
    let response;
    switch (action) {
      case "login":
        response = await api.login(params);
        break;
      case "claims":
        response = await api.get_claims(params);
        break;
      case "link":
        if (!params.provider_token) {
          return res.status(400).json({
            error: "Parameter 'provider_token' wajib diisi untuk action 'link'."
          });
        }
        response = await api.link_account(params);
        break;
      case "series":
        response = await api.series(params);
        break;
      case "recommend":
        response = await api.recommend(params);
        break;
      case "top_recs":
        response = await api.top_recommendations(params);
        break;
      case "hero":
        response = await api.hero_series(params);
        break;
      case "detail":
        if (!params.series_id) {
          return res.status(400).json({
            error: "Parameter 'series_id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.series_detail(params);
        break;
      case "episodes":
        if (!params.series_id) {
          return res.status(400).json({
            error: "Parameter 'series_id' wajib diisi untuk action 'episodes'."
          });
        }
        response = await api.episodes(params);
        break;
      case "stream":
        if (!params.series_id || !params.episode_number) {
          return res.status(400).json({
            error: "Parameter 'series_id' dan 'episode_number' wajib diisi untuk action 'stream'."
          });
        }
        response = await api.episode_url(params);
        break;
      case "progress":
        if (!params.series_id || !params.episode_number) {
          return res.status(400).json({
            error: "Parameter 'series_id' dan 'episode_number' wajib diisi untuk action 'progress'."
          });
        }
        if (!params.progress) params.progress = 100;
        response = await api.update_watch(params);
        break;
      case "check_in":
        response = await api.check_in(params);
        break;
      case "rewards":
        response = await api.rewards_list(params);
        break;
      case "reward_detail":
        if (!params.label) {
          return res.status(400).json({
            error: "Parameter 'label' wajib diisi untuk action 'reward_detail'."
          });
        }
        response = await api.reward_detail(params);
        break;
      case "grant_reward":
        if (!params.label) {
          return res.status(400).json({
            error: "Parameter 'label' wajib diisi untuk action 'grant_reward'."
          });
        }
        response = await api.grant_reward(params);
        break;
      case "unlock":
        if (!params.series_id || !params.episode_number) {
          return res.status(400).json({
            error: "Parameter 'series_id' dan 'episode_number' wajib diisi untuk action 'unlock'."
          });
        }
        response = await api.unlock_episode(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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