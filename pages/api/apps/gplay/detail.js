import axios from "axios";
class PlayKaro {
  constructor() {
    this.baseURL = "https://googleplay.codingkaro.in";
    this.headers = {
      "User-Agent": "NodeJS/Axios-PlayKaro-Client/1.0",
      Accept: "application/json"
    };
  }
  log(msg) {
    console.log(`[PlayKaro] ${msg}`);
  }
  pid(str) {
    const regex = /id=([a-zA-Z0-9_.]+)/;
    const match = str?.match(regex);
    return match ? match[1] : str;
  }
  async req(endpoint) {
    const url = `${this.baseURL}${endpoint}`;
    this.log(`Requesting: ${endpoint}`);
    try {
      const res = await axios.get(url, {
        headers: this.headers
      });
      const data = res?.data;
      if (data?.code !== 200 || data?.error !== "Nil") {
        throw new Error(data?.message || "Unknown API Error");
      }
      return data?.result || [];
    } catch (err) {
      this.log(`Error on ${endpoint}: ${err.message}`);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async app(id) {
    return await this.req(`/app/${id}`);
  }
  async rev(id) {
    return await this.req(`/reviews/${id}`);
  }
  async dev(id) {
    return await this.req(`/developer/${encodeURIComponent(id)}`);
  }
  async download({
    type,
    url,
    ...rest
  }) {
    const target = this.pid(url);
    const mode = type ? type.toLowerCase() : "app";
    if (!target) {
      this.log("Error: Missing URL or ID");
      return {
        error: true,
        message: "Invalid URL/ID"
      };
    }
    this.log(`Mode: ${mode.toUpperCase()} | Target: ${target}`);
    try {
      if (mode === "app") {
        return await this.app(target);
      } else if (mode === "rev") {
        return await this.rev(target);
      } else if (mode === "dev") {
        return await this.dev(target);
      } else {
        throw new Error(`Invalid type: ${mode}. Use 'app', 'rev', or 'dev'.`);
      }
    } catch (err) {
      this.log(`Process failed: ${err.message}`);
      return {
        error: true,
        message: err.message
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
  const api = new PlayKaro();
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