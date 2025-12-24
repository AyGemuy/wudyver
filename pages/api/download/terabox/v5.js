import axios from "axios";
class TeraboxDownloader {
  constructor() {
    this.api = {
      base: "https://teraboxdl.site/api/",
      token: "token",
      terabox: "terabox"
    };
    this.headers = {
      authority: "teraboxdl.site",
      "user-agent": "Postify/1.0.0"
    };
    this.token = null;
  }
  async getToken() {
    if (this.token) {
      return {
        status: "success",
        code: 200,
        result: this.token
      };
    }
    try {
      const response = await axios.get(`${this.api.base}${this.api.token}`, {
        headers: this.headers
      });
      const {
        data,
        status
      } = response;
      if (!data?.token) {
        throw new Error("Token tidak ditemukan.");
      }
      this.token = data.token;
      return {
        status: "success",
        code: status,
        result: this.token
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  isUrl(url) {
    const match = url.match(/https?:\/\/(?:www\.)?(?:\w+)\.(com|app)\/s\/([^\/]+)/i);
    return match ? `https://1024terabox.com/s/${match[2]}` : null;
  }
  async request(endpoint, params = {}) {
    const tokenData = await this.getToken();
    if (tokenData.status === "error") return tokenData;
    try {
      const url = `${this.api.base}${endpoint}?` + new URLSearchParams(params);
      const res = await axios.get(url, {
        headers: {
          ...this.headers,
          "x-access-token": tokenData.result
        }
      });
      if (!res.data || Object.keys(res.data).length === 0) {
        throw new Error("Tidak ada respons dari server.");
      }
      return {
        status: "success",
        code: res.status,
        result: res.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  async download({
    url
  }) {
    if (!url || typeof url !== "string" || url.trim() === "") {
      return {
        status: "error",
        code: 400,
        message: "URL tidak valid."
      };
    }
    const validUrl = this.isUrl(url.trim());
    if (!validUrl) {
      return {
        status: "error",
        code: 400,
        message: "Format URL tidak valid."
      };
    }
    return await this.request(this.api.terabox, {
      url: validUrl
    });
  }
  handleError(error) {
    if (error.response) {
      return {
        status: "error",
        code: error.response.status,
        message: error.response.data?.message || "Terjadi kesalahan."
      };
    } else {
      return {
        status: "error",
        code: 500,
        message: "Terjadi kesalahan pada server."
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
  const api = new TeraboxDownloader();
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