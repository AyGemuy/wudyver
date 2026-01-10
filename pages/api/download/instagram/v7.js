import axios from "axios";
import https from "https";
class IgDownloader {
  constructor(config = {}) {
    this.client = axios.create({
      timeout: config.timeout || 6e4,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      ...config
    });
  }
  extractShortcode(url) {
    try {
      console.log("🔍 Extracting shortcode...");
      const match = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
      const code = match?.[1] || "";
      console.log(code ? `✅ Shortcode: ${code}` : "❌ No shortcode found");
      return code;
    } catch (err) {
      console.error("❌ Extract failed:", err?.message);
      return "";
    }
  }
  async getCsrf(url) {
    try {
      console.log("🔐 Fetching CSRF token...");
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
      const match = data.match(/"csrf_token":"([^"]+)"/);
      const csrf = match?.[1] || "";
      console.log(csrf ? "✅ CSRF token found" : "❌ CSRF token not found");
      return csrf;
    } catch (err) {
      console.error("❌ CSRF fetch failed:", err?.message);
      return "";
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log("⬇️ Starting download...");
      const shortcode = this.extractShortcode(url);
      if (!shortcode) {
        console.error("❌ Invalid URL");
        return null;
      }
      const csrf = await this.getCsrf(url);
      if (!csrf) {
        console.error("❌ No CSRF token");
        return null;
      }
      const form = new URLSearchParams({
        variables: JSON.stringify({
          shortcode: shortcode
        }),
        doc_id: "9510064595728286"
      });
      console.log("📡 Fetching media data...");
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
          "x-root-field-name": "xdt_shortcode_media"
        }
      });
      const media = data?.data?.xdt_shortcode_media;
      if (!media) {
        console.error("❌ No media data");
        return null;
      }
      console.log("✅ Download complete");
      return media;
    } catch (err) {
      console.error("❌ Download failed:", err?.message);
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
  const api = new IgDownloader();
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