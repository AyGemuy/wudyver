import axios from "axios";
import * as cheerio from "cheerio";
class TikTokScraper {
  constructor() {
    this.baseURL = "https://snaptik.app";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";
    this.token = null;
    this.axiosInstance = axios.create({
      headers: {
        "User-Agent": this.userAgent,
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    this.axiosInstance.interceptors.request.use(request => {
      console.log(`➡️ Mengirim ${request.method} ke ${request.url}`);
      return request;
    });
    this.axiosInstance.interceptors.response.use(response => {
      console.log(`⬅️ Menerima ${response.status} dari ${response.config.url}`);
      return response;
    }, error => {
      console.error(`❌ Error pada request: ${error.message}`);
      return Promise.reject(error);
    });
  }
  async initToken() {
    if (this.token) {
      console.log("✅ Token sudah ada.");
      return this.token;
    }
    await this.getToken();
    return this.token;
  }
  async getToken() {
    try {
      console.log("🔄 Mengambil token...");
      const response = await this.axiosInstance.get(`${this.baseURL}/en2`, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const $ = cheerio.load(response.data);
      const token = $('input[name="token"]').val();
      if (!token) throw new Error("Token tidak ditemukan");
      this.token = token;
      console.log("✅ Token berhasil diambil.");
      return token;
    } catch (error) {
      console.error("❌ Gagal mengambil token:", error.message);
      throw error;
    }
  }
  cleanUrlString(url) {
    if (!url) return "";
    return url.replace(/^[\\"]+|[\\"]+$/g, "").replace(/\\"/g, '"');
  }
  extractPhotoLinks(htmlContent) {
    const $ = cheerio.load(htmlContent);
    return $(".column .photo").map((index, el) => {
      const $photo = $(el);
      let imgSrc = $photo.find("img").attr("src");
      let downloadLink = $photo.find(".dl-footer a").attr("href");
      imgSrc = this.cleanUrlString(imgSrc);
      downloadLink = this.cleanUrlString(downloadLink);
      return imgSrc && downloadLink ? {
        index: index + 1,
        imageUrl: imgSrc,
        downloadUrl: downloadLink,
        type: "photo"
      } : undefined;
    }).get().filter(Boolean);
  }
  extractRenderData(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const renderButton = $("button[data-token]");
    if (renderButton.length > 0) {
      return {
        hasRenderButton: true,
        token: renderButton.attr("data-token"),
        isAd: renderButton.attr("data-ad") === "true",
        type: "render"
      };
    }
    return {
      hasRenderButton: false
    };
  }
  extractVideoInfo(decodedHtml) {
    try {
      const downloadBoxMatch = decodedHtml.match(/\$\("#download"\)\.innerHTML = "(.*?)";/);
      let htmlToParse = "";
      if (downloadBoxMatch && downloadBoxMatch[1]) {
        htmlToParse = JSON.parse(`"${downloadBoxMatch[1]}"`);
      } else {
        console.warn("⚠️ Tidak dapat mengekstrak HTML spesifik dari string JavaScript. Mencoba mengurai HTML lengkap.");
        htmlToParse = decodedHtml;
      }
      const $ = cheerio.load(htmlToParse);
      const title = $(".video-title").text().trim() || "Tidak ada judul";
      const author = $(".info span").text().trim() || "Tidak diketahui";
      let thumbnail = $("#thumbnail").attr("src") || "";
      thumbnail = this.cleanUrlString(thumbnail);
      const downloadLinks = [];
      let contentType = "unknown";
      const videoDownloadElements = $('a[href*="rapidcdn"], button[data-tokenhd], button[data-backup]');
      if (videoDownloadElements.length > 0) {
        contentType = "video";
        videoDownloadElements.each((i, el) => {
          const $el = $(el);
          let url = "";
          let label = $el.text().trim();
          let quality = "Normal";
          if ($el.is("a")) {
            url = $el.attr("href");
            if (label.includes("HD")) quality = "HD";
            else if (label.includes("Backup")) label = "Download Video (Backup)";
          } else if ($el.is("button")) {
            if ($el.attr("data-tokenhd")) {
              url = $el.attr("data-tokenhd");
              quality = "HD";
              label = label.includes("Download Video HD") ? label : "Download Video HD";
            } else if ($el.attr("data-backup")) {
              url = $el.attr("data-backup");
              quality = "Normal";
              label = label.includes("Download Video (Backup)") ? label : "Download Video (Backup)";
            }
          }
          url = this.cleanUrlString(url);
          if (url && url.includes("http")) {
            const exists = downloadLinks.some(link => link.url === url);
            if (!exists) {
              downloadLinks.push({
                type: "video",
                url: url,
                quality: quality,
                label: label
              });
            }
          }
        });
      }
      const photos = this.extractPhotoLinks(htmlToParse);
      if (photos.length > 0) {
        contentType = "slideshow";
      }
      const renderData = this.extractRenderData(htmlToParse);
      return {
        title: title,
        author: author,
        thumbnail: thumbnail,
        contentType: contentType,
        downloadLinks: downloadLinks,
        photos: photos,
        renderData: renderData
      };
    } catch (error) {
      console.error("❌ Error mengekstrak info video:", error.message);
      return null;
    }
  }
  decodeObfuscatedJS(body) {
    try {
      const re = /eval\(function\(h,u,n,t,e,r\)\{[\s\S]*?\}\(\s*"([^"]*)"\s*,\s*\d+\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\)/;
      const match = body.match(re);
      if (!match) return body;
      const [, h, N, tStr, eStr] = match;
      const OFFSET = +tStr;
      const BASE_FROM = +eStr;
      const DELIM = N.charAt(BASE_FROM);
      const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
      const fromBase = (str, base) => {
        const tbl = ALPHABET.slice(0, base);
        return str.split("").reverse().reduce((acc, ch, idx) => {
          const v = tbl.indexOf(ch);
          return acc + (v < 0 ? 0 : v * Math.pow(base, idx));
        }, 0);
      };
      const segs = h.split(DELIM).filter(Boolean).map(s => {
        for (let d = 0; d < N.length; d++) s = s.split(N[d]).join(d.toString());
        return String.fromCharCode(fromBase(s, BASE_FROM) - OFFSET);
      }).join("");
      return Buffer.from(segs, "latin1").toString("utf8");
    } catch (error) {
      console.log("⚠️ Dekode gagal, menggunakan respons asli.");
      return body;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("🚀 Memulai scraping TikTok...");
      console.log(`📱 URL: ${url}`);
      console.log("━".repeat(60));
      await this.initToken();
      console.log("🔄 Mengirim request ke API...");
      const formData = new URLSearchParams();
      formData.append("url", url);
      formData.append("lang", "en2");
      formData.append("token", this.token);
      const response = await this.axiosInstance.post(`${this.baseURL}/abc2.php`, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: `${this.baseURL}/en2`,
          Origin: this.baseURL
        }
      });
      if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      console.log("✅ Respons berhasil diterima.");
      console.log("🔄 Memproses respons...");
      const decodedHtml = this.decodeObfuscatedJS(response.data);
      console.log(decodedHtml);
      const videoInfo = this.extractVideoInfo(decodedHtml);
      if (!videoInfo) throw new Error("Tidak dapat mengekstrak informasi video.");
      if (videoInfo.downloadLinks.length === 0 && videoInfo.photos.length === 0) {
        throw new Error("Tidak ada tautan unduhan atau foto ditemukan.");
      }
      return {
        success: true,
        data: {
          originalUrl: url,
          ...videoInfo
        }
      };
    } catch (error) {
      console.error("❌ Error:", error.message);
      return {
        success: false,
        error: error.message,
        originalUrl: url
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  try {
    const tiktokScraper = new TikTokScraper();
    const result = await tiktokScraper.download(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}