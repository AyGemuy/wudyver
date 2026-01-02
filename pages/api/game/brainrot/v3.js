import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class QuizAPI {
  constructor() {
    this.cfg = {
      base: "https://rotrivals.com",
      agent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.token = null;
  }
  headers(extra = {}) {
    return {
      "User-Agent": this.cfg.agent,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: `${this.cfg.base}/`,
      ...extra
    };
  }
  async init() {
    try {
      console.log("[INIT] Getting CSRF token...");
      await this.client.get(this.cfg.base, {
        headers: this.headers()
      });
      const cookies = await this.jar.getCookies(this.cfg.base);
      const xsrf = cookies.find(c => c.key === "XSRF-TOKEN");
      if (xsrf) {
        this.token = decodeURIComponent(xsrf.value);
        console.log("[INIT] Token obtained");
        return true;
      }
      console.log("[INIT] Token not found");
      return false;
    } catch (err) {
      console.log(`[INIT] Failed: ${err?.message || err}`);
      return false;
    }
  }
  async req(url, opts = {}) {
    try {
      if (!this.token) await this.init();
      const headers = this.headers({
        "X-XSRF-TOKEN": this.token,
        ...opts.headers
      });
      console.log(`[REQ] ${opts.method || "GET"} ${url}`);
      const res = await this.client.request({
        url: url,
        method: opts.method || "GET",
        headers: headers,
        ...opts
      });
      console.log(`[OK] Status: ${res?.status}`);
      return res?.data || null;
    } catch (err) {
      console.log(`[ERR] ${err?.message || err}`);
      return null;
    }
  }
  async random({
    ...rest
  }) {
    try {
      console.log("[RANDOM] Fetching characters...");
      const data = await this.req(`${this.cfg.base}/api/characters/random`);
      if (!data || !Array.isArray(data)) {
        return {
          error: true,
          message: "Failed to fetch",
          result: null
        };
      }
      return {
        error: false,
        message: "Characters fetched successfully",
        result: data
      };
    } catch (err) {
      console.log("[RANDOM] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
  async battle({
    winner,
    char1,
    char2,
    ...rest
  }) {
    try {
      const winnerId = winner || rest?.winner;
      const id1 = char1 || rest?.id1;
      const id2 = char2 || rest?.id2;
      if (!winnerId || !id1 || !id2) {
        return {
          error: true,
          message: "Missing parameters: winner, char1, char2",
          result: null
        };
      }
      console.log(`[BATTLE] Winner: ${winnerId}, Char1: ${id1}, Char2: ${id2}`);
      const data = await this.req(`${this.cfg.base}/battles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        data: {
          winner_character_id: winnerId,
          character_id_1: id1,
          character_id_2: id2
        }
      });
      if (!data) {
        return {
          error: true,
          message: "Battle failed",
          result: null
        };
      }
      return {
        error: false,
        message: "Battle recorded successfully",
        result: data
      };
    } catch (err) {
      console.log("[BATTLE] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
  async percentage({
    winner,
    char1,
    char2,
    ...rest
  }) {
    try {
      const winnerId = winner || rest?.winner;
      const id1 = char1 || rest?.id1;
      const id2 = char2 || rest?.id2;
      if (!winnerId || !id1 || !id2) {
        return {
          error: true,
          message: "Missing parameters: winner, char1, char2",
          result: null
        };
      }
      console.log(`[PERCENTAGE] Winner: ${winnerId}, Char1: ${id1}, Char2: ${id2}`);
      const data = await this.req(`${this.cfg.base}/getResultPercentage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        data: {
          winner_character_id: winnerId,
          character_id_1: id1,
          character_id_2: id2
        }
      });
      if (!data) {
        return {
          error: true,
          message: "Failed to get percentage",
          result: null
        };
      }
      return {
        error: false,
        message: "Percentage fetched successfully",
        result: data
      };
    } catch (err) {
      console.log("[PERCENTAGE] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
  async whoIsIt({
    audio,
    ...rest
  }) {
    try {
      const withAudio = audio ?? rest?.audio ?? false;
      const endpoint = withAudio ? "/whoIsItRandomWithAudio" : "/whoIsItRandom";
      console.log(`[WHOISIT] Fetching... (Audio: ${withAudio})`);
      const data = await this.req(`${this.cfg.base}${endpoint}`);
      if (!data || !data.characters) {
        return {
          error: true,
          message: "Failed to fetch",
          result: null
        };
      }
      return {
        error: false,
        message: "Who is it fetched successfully",
        result: {
          characters: data.characters,
          selection: data.selection
        }
      };
    } catch (err) {
      console.log("[WHOISIT] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
  async generate({
    mode,
    ...rest
  }) {
    try {
      const m = mode || rest?.m || "whoisit";
      console.log(`[GENERATE] Mode: ${m}`);
      if (m === "random") return await this.random({
        ...rest
      });
      if (m === "battle") return await this.battle({
        ...rest
      });
      if (m === "percentage") return await this.percentage({
        ...rest
      });
      if (m === "whoisit") return await this.whoIsIt({
        ...rest
      });
      console.log(`[GENERATE] Invalid mode: ${m}`);
      return {
        error: true,
        message: `Invalid mode: ${m}. Valid modes: random, battle, percentage, whoisit`,
        result: null
      };
    } catch (err) {
      console.log("[GENERATE] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new QuizAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}