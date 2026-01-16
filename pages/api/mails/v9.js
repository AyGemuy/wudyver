import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class WebhookFetcher {
  constructor(baseURL = "https://webhook.site") {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        connection: "keep-alive",
        pragma: "no-cache",
        referer: "https://webhook.site/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ...SpoofHead()
      },
      withCredentials: true
    });
    this.cookieJar = {};
    this.updateCookieHeader();
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]).forEach(header => {
          const parsed = this.parseSetCookie(header);
          Object.assign(this.cookieJar, parsed);
        });
        this.updateCookieHeader();
      }
      return response;
    });
  }
  updateCookieHeader() {
    this.axiosInstance.defaults.headers.common["Cookie"] = Object.entries(this.cookieJar).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  parseSetCookie(cookieString) {
    const cookies = {};
    if (!cookieString) return cookies;
    cookieString.split(";").forEach(cookie => {
      const parts = cookie.trim().split("=");
      if (parts.length > 1) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        cookies[key] = value;
      }
    });
    return cookies;
  }
  getXSRFToken() {
    return this.cookieJar["XSRF-TOKEN"] || "";
  }
  getDomain() {
    return ["emailhook.site"];
  }
  async create({
    password = ""
  }) {
    try {
      const response = await this.axiosInstance.post("/token", {
        password: password,
        timeout: "0"
      }, {
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "x-xsrf-token": this.getXSRFToken()
        }
      });
      const {
        uuid
      } = response.data;
      const email = `${uuid}@${this.getDomain()[Math.floor(Math.random() * this.getDomain().length)]}`;
      return {
        ...response.data,
        email: email
      };
    } catch (error) {
      throw error;
    }
  }
  async message({
    email,
    password = "",
    page = 1,
    query = "",
    sort = "newest"
  }) {
    try {
      const uuid = email.includes("@") ? email.split("@")[0] : email;
      const response = await this.axiosInstance.get(`/token/${uuid}/requests`, {
        params: {
          page: page,
          password: password,
          query: query,
          sorting: sort
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const webhookFetcher = new WebhookFetcher();
  try {
    switch (action) {
      case "list":
        try {
          const domain = webhookFetcher.getDomain();
          return res.status(200).json(domain);
        } catch (error) {
          return res.status(500).json({
            error: "Gagal mengambil daftar domain."
          });
        }
      case "create":
        try {
          const newData = await webhookFetcher.create(params);
          return res.status(200).json(newData);
        } catch (error) {
          return res.status(500).json({
            error: "Gagal membuat uuid dan email."
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
          });
        }
        try {
          const messages = await webhookFetcher.message(params);
          return res.status(200).json(messages);
        } catch (error) {
          return res.status(500).json({
            error: "Gagal mengambil pesan."
          });
        }
      default:
        return res.status(400).json({
          error: "Tindakan tidak valid. Gunakan 'list', 'create', atau 'message'."
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Kesalahan Server Internal"
    });
  }
}