import crypto from "crypto";
import axios from "axios";
import https from "https";
class MusicAI {
  constructor(options = {}) {
    this.config = {
      BASE_URL: "https://func-america.anyscanner.net/api/song",
      SECRET_KEY: "LT17opvvp6fiJ1AeFewb1F2xga8HTcJM",
      SOFT_NAME: "musica"
    };
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      timeout: 45e3,
      rejectUnauthorized: false
    });
    this.axios = axios.create({
      httpsAgent: this.httpsAgent,
      timeout: 45e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36",
        "Content-Type": "application/json"
      }
    });
  }
  _md5(input) {
    try {
      const hash = crypto.createHash("md5").update(input, "utf8").digest();
      const hexArr = [];
      for (let i = 0; i < hash.length; i++) {
        let hex = (hash[i] & 255).toString(16);
        if (hex.length === 1) hex = "0" + hex;
        hexArr.push(hex);
      }
      return hexArr.join("").toUpperCase();
    } catch (error) {
      console.error("❌ MD5 generation error:", error.message);
      throw error;
    }
  }
  _sign(time) {
    const raw = `${this.config.SOFT_NAME}${time}${this.config.SECRET_KEY}`;
    const signature = this._md5(raw);
    console.log(`[SIGN] Generated: ${signature}`);
    return signature;
  }
  async _get({
    endpoint,
    params = {},
    ...rest
  }) {
    try {
      console.log(`📥 GET ${endpoint}`);
      const time = Math.floor(Date.now() / 1e3);
      const sign = this._sign(time);
      const queryParams = {
        soft: this.config.SOFT_NAME,
        time: String(time),
        sign: sign,
        ...params
      };
      const url = `${this.config.BASE_URL}${endpoint}`;
      console.log(`[API] GET ${url}`, {
        time: time,
        sign: sign,
        params: Object.keys(params)
      });
      const response = await this.axios.get(url, {
        params: queryParams,
        ...rest
      });
      console.log(`✅ GET ${endpoint} success`);
      if (endpoint.includes("lyric") && typeof response.data === "string") {
        return this._parseStreamingResponse(response.data);
      }
      return response.data;
    } catch (error) {
      console.error(`❌ GET ${endpoint} failed:`, error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }
  async _post({
    endpoint,
    data = {},
    ...rest
  }) {
    try {
      console.log(`📤 POST ${endpoint}`);
      const time = Math.floor(Date.now() / 1e3);
      const sign = this._sign(time);
      const postData = {
        soft: this.config.SOFT_NAME,
        time: String(time),
        sign: sign,
        ...data
      };
      const url = `${this.config.BASE_URL}${endpoint}`;
      console.log(`[API] POST ${url}`, {
        time: time,
        sign: sign,
        dataKeys: Object.keys(data)
      });
      const response = await this.axios.post(url, postData, {
        timeout: 4e4,
        ...rest
      });
      console.log(`✅ POST ${endpoint} success`);
      return response.data;
    } catch (error) {
      console.error(`❌ POST ${endpoint} failed:`, error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }
  _parseStreamingResponse(data) {
    try {
      if (typeof data !== "string") return data;
      const lines = data.split("\n").filter(line => line.trim());
      const results = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          results.push(parsed);
        } catch (e) {
          console.log("[STREAM] Non-JSON line:", line.substring(0, 100));
        }
      }
      if (results.length > 0) {
        return results.length === 1 ? results[0] : results;
      }
      return data;
    } catch (error) {
      console.error("❌ Streaming parse error:", error.message);
      return data;
    }
  }
  async random({
    ...rest
  } = {}) {
    try {
      console.log("-> Calling randomLyric...");
      const result = await this._get({
        endpoint: "/idea-v2/random-lyric",
        ...rest
      });
      console.log("✅ Random lyric completed");
      return result;
    } catch (error) {
      console.error("❌ randomLyric failed:", error.message);
      throw error;
    }
  }
  async improve({
    lyric = "",
    ...rest
  } = {}) {
    try {
      if (!lyric) throw new Error("Lyric parameter is required");
      console.log("-> Calling improveLyric...");
      const result = await this._get({
        endpoint: "/idea-v2/improve-lyric",
        params: {
          lyric: encodeURIComponent(lyric)
        },
        ...rest
      });
      console.log("✅ Improve lyric completed");
      return result;
    } catch (error) {
      console.error("❌ improveLyric failed:", error.message);
      throw error;
    }
  }
  async to_lyric({
    idea = "",
    ...rest
  } = {}) {
    try {
      if (!idea) throw new Error("Idea parameter is required");
      console.log("-> Calling ideaToLyrics...");
      const result = await this._get({
        endpoint: "/idea-v2/to-lyric",
        params: {
          idea: encodeURIComponent(idea)
        },
        ...rest
      });
      console.log("✅ Idea to lyrics completed");
      return result;
    } catch (error) {
      console.error("❌ ideaToLyrics failed:", error.message);
      throw error;
    }
  }
  async idea({
    length = 10,
    ...rest
  } = {}) {
    try {
      console.log("-> Calling randomIdea...");
      const result = await this._get({
        endpoint: "/idea/random",
        params: {
          length: length
        },
        ...rest
      });
      console.log("✅ Random idea completed");
      return result;
    } catch (error) {
      console.error("❌ randomIdea failed:", error.message);
      throw error;
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new MusicAI();
  try {
    let response;
    switch (action) {
      case "random":
        response = await api.random(params);
        break;
      case "improve":
        if (!params.lyric) {
          return res.status(400).json({
            error: "Parameter 'lyric' wajib untuk improve"
          });
        }
        response = await api.improve(params);
        break;
      case "to_lyric":
        if (!params.idea) {
          return res.status(400).json({
            error: "Parameter 'idea' wajib untuk to_lyric"
          });
        }
        response = await api.to_lyric(params);
        break;
      case "idea":
        response = await api.idea(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: random, improve, to_lyric, idea`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[MUSIC AI ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}