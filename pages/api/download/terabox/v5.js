import axios from "axios";
class Terabox {
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
    if (this.token) return {
      status: "success",
      code: 200,
      result: this.token
    };
    try {
      const {
        data,
        status
      } = await axios.get(`${this.api.base}${this.api.token}`, {
        headers: this.headers
      });
      if (!data || !data.token) return {
        status: "error",
        code: 404,
        message: "Tokennya kagak ada bree, coba lagi nanti yak 😬"
      };
      this.token = data.token;
      return {
        status: "success",
        code: status,
        result: this.token
      };
    } catch (error) {
      return {
        status: "error",
        code: error.response?.status || 500,
        message: error.response?.data.message || error.message
      };
    }
  }
  isUrl(url) {
    const match = url.match(/https?:\/\/(?:www\.)?(?:\w+)\.(com|app)\/s\/([^\/]+)/i);
    return match ? `https://1024terabox.com/s/${match[2]}` : null;
  }
  async request(endpoint, params = {}) {
    const tokenResponse = await this.getToken();
    if (tokenResponse.status === "error") return tokenResponse;
    const url = `${this.api.base}${endpoint}?` + new URLSearchParams(params);
    try {
      const {
        data,
        status
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          "x-access-token": tokenResponse.result
        }
      });
      if (!data || Object.keys(data).length === 0) return {
        status: "error",
        code: status,
        message: "Kagak ada response dari apinya bree..."
      };
      return {
        status: "success",
        code: status,
        result: data.data
      };
    } catch (error) {
      return {
        status: "error",
        code: error.response?.status || 500,
        message: error.response?.data.message || error.message
      };
    }
  }
  async download(url) {
    if (!url || typeof url !== "string" || url.trim() === "") return {
      status: "error",
      code: 400,
      message: "Lu niat download pake Terabox kagak? Input lu kosong anjiir 🙃"
    };
    const linkNya = this.isUrl(url.trim());
    if (!linkNya) return {
      status: "error",
      code: 400,
      message: 'Kagak valid tuh linknya.. link yang dibolehin tuh kek gini "https://terabox.com/s/abcdefgh"'
    };
    const response = await this.request(this.api.terabox, {
      url: linkNya
    });
    return response.status === "error" ? response : {
      status: "success",
      code: 200,
      result: response.result
    };
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      message: "No url provided"
    });
  }
  const terabox = new Terabox();
  try {
    const result = await terabox.download(url);
    return res.status(200).json(typeof result === "object" ? result : result);
  } catch (error) {
    console.error("Error during download:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}