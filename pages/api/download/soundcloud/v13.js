import axios from "axios";
import * as cheerio from "cheerio";
class ForhubDownloader {
  constructor() {
    this.baseUrl = "https://www.forhub.io";
    this.cookies = {};
    this.csrfToken = null;
    this.client = axios.create({
      timeout: 6e4,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.response.use(response => {
      this._interceptSetCookie(response);
      return response;
    }, error => {
      if (error.response) this._interceptSetCookie(error.response);
      return Promise.reject(error);
    });
    this.client.interceptors.request.use(config => {
      const cookieString = this._buildCookieString();
      if (cookieString) config.headers.Cookie = cookieString;
      return config;
    });
  }
  _interceptSetCookie(response) {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const [nameValue] = cookie.split(";");
        const [name, value] = nameValue.split("=");
        if (name && value) this.cookies[name.trim()] = decodeURIComponent(value.trim());
      });
    }
  }
  _buildCookieString() {
    return Object.entries(this.cookies).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; ");
  }
  async _ensureSessionAndToken() {
    if (this.csrfToken && Object.keys(this.cookies).some(key => key.toUpperCase().includes("PHPSESSID"))) return;
    try {
      const response = await this.client.get(`${this.baseUrl}/`, {
        headers: {
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1"
        }
      });
      const $ = cheerio.load(response.data);
      let token = $('input[name="csrf_token"]').val() || $('input[type="hidden"][name*="csrf"][value]').val() || $('input[type="hidden"][name*="token"][value]').val() || $('meta[name="csrf-token"]').attr("content");
      if (!token) {
        const scriptRegexes = [/csrf_token["']?\s*:\s*["']([^"']+)["']/i, /csrfToken["']?\s*:\s*["']([^"']+)["']/i, /window\.csrfToken\s*=\s*["']([^"']+)["']/i, /name=["']csrf_token["']\svalue=["']([^"]+)["']/i];
        for (const regex of scriptRegexes) {
          const match = response.data.match(regex);
          if (match && match[1]) {
            token = match[1];
            break;
          }
        }
      }
      if (token) this.csrfToken = token;
      else throw new Error("Gagal mendapatkan CSRF token.");
    } catch (error) {
      console.error("Error saat memastikan sesi dan token:", error.message);
      throw new Error(`Gagal menginisialisasi sesi/token: ${error.message}`);
    }
  }
  async download({
    url
  }) {
    if (!url) return {
      success: false,
      error: "Paramenter URL tidak ada.",
      downloadLinks: [],
      messages: ["Paramenter URL tidak ada."]
    };
    try {
      await this._ensureSessionAndToken();
      if (!this.csrfToken) throw new Error("CSRF token tidak ada.");
      const postData = new URLSearchParams({
        csrf_token: this.csrfToken,
        formurl: url
      });
      const response = await this.client.post(`${this.baseUrl}/download.php`, postData.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          priority: "u=0, i"
        }
      });
      return this._parseDownloadPage(response.data, url);
    } catch (error) {
      let errorMessage = error.message,
        errorDetails = null;
      if (error.response) {
        errorMessage = `Error server ${error.response.status}: ${error.message}`;
        errorDetails = error.response.data;
      }
      console.error(`Error pada ForhubDownloader untuk URL ${url}:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
        downloadLinks: [],
        messages: [errorMessage],
        originalUrl: url,
        details: errorDetails
      };
    }
  }
  _parseDownloadPage(htmlData, originalUrl) {
    const $ = cheerio.load(htmlData);
    const results = {
      success: false,
      pageTitle: $("head title").text().trim() || $("h1,h2,h3").first().text().trim() || null,
      trackInfo: {
        image: null,
        title: null,
        bitrate: null
      },
      downloadLinks: [],
      messages: [],
      originalUrl: originalUrl
    };
    $('.alert,.alert-danger,.alert-warning,.alert-info,.text-danger,.text-warning,.text-info,.error,.warning,.info,[class*="message"],[id*="error"],[id*="info"]').each((i, el) => {
      const messageText = $(el).text().trim();
      if (messageText) results.messages.push(messageText);
    });
    const firstTableRows = $('table:has(th:contains("Track Image"))').first().find("tbody tr.mobtable2");
    if (firstTableRows.length > 0) {
      const cells = firstTableRows.first().find("td.small-10.columns");
      if (cells.length >= 3) {
        results.trackInfo.image = cells.eq(0).find("img").attr("src") || null;
        results.trackInfo.title = cells.eq(1).text().trim() || null;
        results.trackInfo.bitrate = cells.eq(2).text().trim() || null;
      }
    }
    const downloadDiv = $("div#dlMP3.download-btn-main1");
    if (downloadDiv.length > 0) {
      const onclickAttr = downloadDiv.attr("onclick");
      const titleAttr = downloadDiv.attr("title");
      const buttonText = downloadDiv.clone().children().remove().end().text().trim();
      if (onclickAttr) {
        const match = onclickAttr.match(/downloadFile\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/);
        if (match && match[1]) {
          let dlUrl = match[1];
          if (!dlUrl.startsWith("http")) try {
            dlUrl = new URL(dlUrl, this.baseUrl).toString();
          } catch (e) {
            dlUrl = null;
          }
          if (dlUrl) {
            const fileOnClick = match[2] ? `${match[2]}.mp3` : null;
            let fileFromTitle = null;
            if (titleAttr) {
              const tMatch = titleAttr.match(/Download\s+(.*)/i);
              if (tMatch && tMatch[1]) fileFromTitle = tMatch[1];
            }
            results.downloadLinks.push({
              url: dlUrl,
              text: buttonText || "Download Song",
              filename: fileOnClick || fileFromTitle || (results.trackInfo.title ? `${results.trackInfo.title}.mp3` : "track.mp3"),
              quality: results.trackInfo.bitrate || null,
              type: "primary"
            });
            results.success = true;
          }
        }
      }
    }
    if (results.downloadLinks.length === 0) {
      $("a[href]").each((i, elem) => {
        const link = $(elem);
        let href = link.attr("href");
        const text = link.text().toLowerCase();
        if (href && href !== "#" && !href.startsWith("javascript:")) {
          const isDl = href.includes("download") || href.includes("cdn") || text.includes("download") || text.includes("unduh") || link.attr("download") !== undefined;
          if (isDl) {
            if (!href.startsWith("http")) try {
              href = new URL(href, this.baseUrl).toString();
            } catch (e) {
              return;
            }
            if (!results.downloadLinks.some(dl => dl.url === href)) results.downloadLinks.push({
              url: href,
              text: link.text().trim() || link.attr("title") || "Tautan Alternatif",
              type: "alternative"
            });
          }
        }
      });
      $("video[src], audio[src]").each((i, elem) => {
        let src = $(elem).attr("src");
        if (src && !src.startsWith("blob:")) {
          if (!src.startsWith("http")) try {
            src = new URL(src, this.baseUrl).toString();
          } catch (e) {
            return;
          }
          if (!results.downloadLinks.some(dl => dl.url === src)) results.downloadLinks.push({
            url: src,
            text: $(elem).attr("title") || "Berkas Media",
            type: "media_source"
          });
        }
      });
    }
    if (results.downloadLinks.length > 0) results.success = true;
    else {
      results.success = false;
      if (results.messages.length === 0) results.messages.push("Tidak ada tautan unduhan ditemukan.");
      const errKw = ["error", "failed", "gagal", "tidak ditemukan", "not found", "invalid", "kadaluarsa", "expired"];
      if (!results.error && results.messages.some(msg => errKw.some(kw => msg.toLowerCase().includes(kw)))) results.error = results.messages.join("; ");
      else if (!results.error) results.error = "Proses unduh gagal atau tidak ada tautan.";
    }
    if (results.downloadLinks.length > 0) {
      const uniqueLinks = new Map();
      results.downloadLinks.forEach(link => {
        if (!uniqueLinks.has(link.url)) uniqueLinks.set(link.url, link);
        else {
          const existing = uniqueLinks.get(link.url);
          if (link.type === "primary" && existing.type !== "primary" || link.filename && !existing.filename) uniqueLinks.set(link.url, link);
        }
      });
      results.downloadLinks = Array.from(uniqueLinks.values());
    }
    if (!results.pageTitle && results.trackInfo.title) results.pageTitle = results.trackInfo.title;
    return results;
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new ForhubDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}