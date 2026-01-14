import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import qs from "qs";
class TeraDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 3e4
    }));
    this.baseUrl = "https://terabxdownloader.org";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Referer: "https://terabxdownloader.org/",
      Origin: "https://terabxdownloader.org",
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Pragma: "no-cache",
      Priority: "u=1, i",
      "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "X-Requested-With": "XMLHttpRequest"
    };
    this.config = {
      ajaxUrl: null,
      nonce: null
    };
  }
  clean(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.clean(item));
    }
    if (typeof data === "object" && data !== null) {
      return Object.fromEntries(Object.entries(data).map(([key, value]) => {
        const cleanKey = key.replace(/[^\w\s]/g, "").trim().replace(/\s+/g, "_").toLowerCase();
        return [cleanKey || key, this.clean(value)];
      }));
    }
    return data;
  }
  async init() {
    try {
      console.log("[LOG] Fetching page for nonce...");
      const response = await this.client.get(this.baseUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      let scriptContent = "";
      $("script").each((i, el) => {
        const html = $(el).html() || "";
        if (html.includes("var terabox_ajax")) {
          scriptContent = html;
        }
      });
      const match = scriptContent.match(/var\s+terabox_ajax\s*=\s*(\{[\s\S]*?\});/);
      let json = {};
      if (match && match[1]) {
        try {
          json = JSON.parse(match[1]);
        } catch (e) {
          console.error("[ERR] JSON Parse failed, trying manual extraction");
          const urlMatch = match[1].match(/"ajax_url"\s*:\s*"([^"]+)"/);
          const nonceMatch = match[1].match(/"nonce"\s*:\s*"([^"]+)"/);
          json = {
            ajax_url: urlMatch ? urlMatch[1] : null,
            nonce: nonceMatch ? nonceMatch[1] : null
          };
        }
      }
      this.config.ajaxUrl = json?.ajax_url || `${this.baseUrl}/wp-admin/admin-ajax.php`;
      this.config.nonce = json?.nonce || "";
      console.log(`[LOG] Init success. Nonce: ${this.config.nonce}`);
    } catch (e) {
      console.error(`[ERR] Init failed: ${e.message}`);
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      if (!this.config.nonce) await this.init();
      console.log(`[LOG] Processing URL: ${url}`);
      const payload = {
        action: "terabox_fetch",
        url: url,
        nonce: this.config.nonce,
        ...rest
      };
      const {
        data
      } = await this.client.post(this.config.ajaxUrl, qs.stringify(payload), {
        headers: this.headers
      });
      const cleanData = this.clean(data?.data || {});
      const {
        folders = [],
          files = []
      } = cleanData;
      const items = [...folders.map(f => ({
        ...f,
        category: "folder"
      })), ...files.map(f => ({
        ...f,
        category: "file"
      }))];
      return {
        success: data?.success || false,
        status: cleanData.status || "Unknown",
        short_link: cleanData.shortlink || null,
        total_items: items.length,
        items: items
      };
    } catch (e) {
      console.error(`[ERR] Process error: ${e.message}`);
      return {
        success: false,
        items: [],
        error: e.message
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
  const api = new TeraDownloader();
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