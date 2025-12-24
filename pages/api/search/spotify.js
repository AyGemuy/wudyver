import axios from "axios";
class Spotify {
  constructor() {
    this.tokenEndpoint = "https://open.spotify.com/get_access_token?reason=transport&productType=web-player";
    this.apiBase = "https://api.spotify.com/v1";
    this.token = null;
  }
  async getAccessToken() {
    try {
      const {
        data
      } = await axios.get(this.tokenEndpoint);
      this.token = data.accessToken;
      return this.token;
    } catch (error) {
      throw new Error("❌ Gagal mendapatkan akses token");
    }
  }
  async request(endpoint) {
    try {
      if (!this.token) await this.getAccessToken();
      const {
        data,
        status
      } = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      if (status !== 200) throw new Error(`❌ Status code: ${status}`);
      return data;
    } catch (error) {
      throw new Error(`❌ Gagal melakukan request: ${error.message}`);
    }
  }
  extractID(url) {
    try {
      const regex = /(?:https?:\/\/)?(?:open\.spotify\.com\/|spotify:)(album|track|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/;
      const match = url.match(regex);
      if (!match) throw new Error("❌ URL tidak valid atau tidak didukung");
      return {
        type: match[1],
        id: match[2]
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async getTrackInfo(url) {
    try {
      const {
        type,
        id
      } = this.extractID(url);
      if (type !== "track") throw new Error("❌ URL bukan track. Gunakan metode lain.");
      const endpoint = `${this.apiBase}/tracks/${id}`;
      const response = await this.request(endpoint);
      return response;
    } catch (error) {
      throw new Error(`❌ Gagal mengambil informasi track: ${error.message}`);
    }
  }
  async search(query, type = "track", limit = 10) {
    try {
      const endpoint = `${this.apiBase}/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`;
      const response = await this.request(endpoint);
      return response;
    } catch (error) {
      throw new Error(`❌ Gagal mencari data: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    type = "track",
    limit = 10,
    url
  } = req.method === "GET" ? req.query : req.body;
  const spotify = new Spotify();
  try {
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query tidak boleh kosong"
        });
        return res.status(200).json(await spotify.search(query, type, limit));
      case "track":
        if (!url) return res.status(400).json({
          error: "URL tidak boleh kosong"
        });
        return res.status(200).json(await spotify.getTrackInfo(url));
      default:
        return res.status(400).json({
          error: "Action tidak valid"
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}