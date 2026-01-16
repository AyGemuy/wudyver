import axios from "axios";
import {
  FormData
} from "formdata-node";
import {
  parseString
} from "xml2js";
class HtmlFetcher {
  constructor() {
    this.url = "https://onlinetool.app/run/html_from_url";
    this.client = axios.create({
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.cookies = "";
  }
  async getToken() {
    try {
      const res = await this.client.get("https://onlinetool.app/ext/html_from_url");
      this.cookies = res.headers["set-cookie"]?.join("; ") || "";
      const tokenMatch = this.cookies.match(/XSRF-TOKEN=([^;]+)/);
      return tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
    } catch (error) {
      console.error("Error fetching token:", error.message);
      return null;
    }
  }
  decodeHTML(html) {
    return new Promise((resolve, reject) => {
      parseString(`<root>${html}</root>`, (err, result) => {
        err ? reject(err) : resolve(result.root);
      });
    });
  }
  async download({
    url: targetUrl
  }) {
    try {
      const xsrfToken = await this.getToken();
      if (!xsrfToken) throw new Error("Gagal mendapatkan XSRF-TOKEN");
      const form = new FormData();
      form.append("url", targetUrl);
      const headers = {
        "x-xsrf-token": xsrfToken,
        cookie: this.cookies,
        origin: "https://onlinetool.app",
        referer: "https://onlinetool.app/ext/html_from_url"
      };
      const response = await this.client.post(this.url, form, {
        headers: headers
      });
      const htmlEntities = response.data.output.join("\n");
      return await this.decodeHTML(htmlEntities);
    } catch (error) {
      console.error("Error fetching HTML:", error.message);
      return null;
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
  const api = new HtmlFetcher();
  try {
    const result = await api.download(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}