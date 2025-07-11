import axios from "axios";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.baseUrl = "https://soundcloudtool.com";
    this.cookies = {};
    this.token = null;
    this.client = axios.create({
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      }
    });
    this.client.interceptors.response.use(response => {
      this.interceptSetCookie(response);
      return response;
    }, error => {
      if (error.response) this.interceptSetCookie(error.response);
      return Promise.reject(error);
    });
    this.client.interceptors.request.use(config => {
      config.headers.Cookie = this.buildCookieString();
      return config;
    });
  }
  interceptSetCookie(response) {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const [nameValue] = cookie.split(";");
        const [name, value] = nameValue.split("=");
        if (name && value) this.cookies[name.trim()] = decodeURIComponent(value.trim());
      });
    }
  }
  buildCookieString() {
    return Object.entries(this.cookies).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; ");
  }
  async getTokenFromHomePage() {
    try {
      const response = await this.client.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      const token = $('form#soundcloud-form input[name="_token"]').attr("value");
      if (token) {
        this.token = token;
        console.log("Token berhasil diambil:", token);
        return token;
      }
      throw new Error("Token tidak ditemukan di halaman");
    } catch (error) {
      console.error("Error saat mengambil token:", error.message);
      throw error;
    }
  }
  async downloadSoundCloud(soundcloudUrl) {
    try {
      if (!this.token) await this.getTokenFromHomePage();
      const formData = new URLSearchParams({
        _token: this.token,
        url: soundcloudUrl
      });
      const response = await this.client.post(`${this.baseUrl}/soundcloud-downloader-tool`, formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: this.baseUrl,
          Referer: `${this.baseUrl}/`
        }
      });
      return this.parseDownloadResult(response.data);
    } catch (error) {
      console.error("Error saat download:", error.message);
      throw error;
    }
  }
  parseDownloadResult(htmlData) {
    const $ = cheerio.load(htmlData);
    const result = {};
    const mainContent = $("main .container");
    if (mainContent.length > 0) {
      const coverImage = mainContent.find("img").first();
      result.coverImage = coverImage.attr("src") || null;
      result.coverAlt = coverImage.attr("alt") || null;
      result.title = mainContent.find("p.text-lg.font-medium.text-gray-800").first().text().trim() || null;
      result.artist = mainContent.find("p.text-sm.text-gray-500").first().text().replace("By ", "").trim() || null;
      result.status = mainContent.find("p.text-orange-600.font-semibold").text().trim() || null;
      const downloadLink = mainContent.find("#trackLink");
      result.downloadUrl = downloadLink.attr("href") || null;
      result.filename = downloadLink.attr("data-filename") || null;
      result.success = !!result.downloadUrl;
      result.isPreview = !!(result.downloadUrl && result.downloadUrl.includes("preview"));
    } else {
      result.success = false;
      result.error = "Tidak dapat menemukan konten utama";
    }
    return result;
  }
  async download({
    url
  }) {
    if (!url) {
      const errorMsg = "URL tidak disediakan dalam objek parameter.";
      console.error("Error:", errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
    try {
      console.log(`Memulai download dari: ${url}`);
      const result = await this.downloadSoundCloud(url);
      if (result.success) {
        console.log("Download berhasil!");
        console.log(`Judul: ${result.title}`);
        console.log(`Artist: ${result.artist}`);
        console.log(`Download URL: ${result.downloadUrl}`);
        console.log(`Filename: ${result.filename}`);
        if (result.isPreview) console.log("⚠️  Warning: Ini adalah preview file, bukan full track");
      } else {
        console.log("Download gagal:", result.error);
      }
      return result;
    } catch (error) {
      console.error("Error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}