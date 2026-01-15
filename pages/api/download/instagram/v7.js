import axios from "axios";
import https from "https";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class IgDownloader {
  constructor(config = {}) {
    this.client = axios.create({
      timeout: config.timeout || 6e4,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      maxRedirects: 5,
      ...config
    });
    this.maxAttempts = 60;
    this.retryDelay = 3e3;
  }
  extractShortcode(url) {
    try {
      const match = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
      const code = match?.[1] || "";
      return code;
    } catch (err) {
      return "";
    }
  }
  async getCsrf(url) {
    try {
      const {
        data
      } = await this.client.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml",
          "Accept-Encoding": "gzip",
          "sec-fetch-mode": "navigate"
        }
      });
      let csrf = "";
      const match = data.match(/"csrf_token":"([^"]+)"/);
      if (match) {
        csrf = match[1];
      } else {
        const match2 = data.match(/csrf_token\\":\\"([^"]+)\\"/);
        csrf = match2?.[1] || "";
      }
      return csrf;
    } catch (err) {
      throw new Error(`CSRF Fetch Failed: ${err.message}`);
    }
  }
  async download({
    url
  }) {
    const shortcode = this.extractShortcode(url);
    if (!shortcode) {
      console.error("❌ Invalid URL: No shortcode found");
      return null;
    }
    console.log(`⬇️ Starting download for: ${shortcode}`);
    console.log(`⚙️ Config: Max ${this.maxAttempts} attempts, ${this.retryDelay}ms delay.`);
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${this.maxAttempts}...`);
        const csrf = await this.getCsrf(url);
        if (!csrf) {
          throw new Error("CSRF token not found / null");
        }
        const form = new URLSearchParams({
          variables: JSON.stringify({
            shortcode: shortcode
          }),
          doc_id: "9510064595728286"
        });
        const {
          data
        } = await this.client.post("https://www.instagram.com/graphql/query", form, {
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            "Accept-Encoding": "gzip",
            "Content-Type": "application/x-www-form-urlencoded",
            "x-asbd-id": "359341",
            "x-csrftoken": csrf,
            "x-fb-friendly-name": "PolarisPostActionLoadPostQueryQuery",
            "x-ig-app-id": "936619743392459",
            "x-root-field-name": "xdt_shortcode_media",
            Referer: url
          }
        });
        const media = data?.data?.xdt_shortcode_media;
        if (media) {
          console.log(`✅ Success on attempt ${attempt}`);
          return media;
        } else {
          throw new Error("Media data is null/empty");
        }
      } catch (err) {
        console.warn(`⚠️ Failed attempt ${attempt}: ${err.message}`);
        if (attempt < this.maxAttempts) {
          await sleep(this.retryDelay);
        }
      }
    }
    console.error("❌ All attempts failed.");
    return null;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new IgDownloader();
  try {
    const data = await api.download(params);
    if (data) {
      return res.status(200).json(data);
    } else {
      return res.status(500).json({
        error: "Gagal mengambil data setelah mencoba berulang kali.",
        info: "Server Instagram mungkin sedang membatasi akses."
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal"
    });
  }
}