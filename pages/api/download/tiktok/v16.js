import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
class TikTokDownloader {
  constructor() {
    this.baseUrl = "https://musicaldown.com";
    this.cookieJar = {};
    this.formFields = {};
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=0, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      },
      withCredentials: true
    });
    this.axiosInstance.interceptors.response.use(response => {
      response.headers["set-cookie"]?.forEach(cStr => {
        const parts = cStr.split(";")[0].split("=");
        if (parts.length === 2) this.cookieJar[parts[0].trim()] = parts[1].trim();
      });
      return response;
    }, Promise.reject);
    this.axiosInstance.interceptors.request.use(config => {
      const cStr = Object.entries(this.cookieJar).map(([key, val]) => `${key}=${val}`).join("; ");
      if (cStr) config.headers.Cookie = cStr.trim();
      return config;
    }, Promise.reject);
  }
  async _init() {
    try {
      console.log("Mengambil data form...");
      const $ = cheerio.load((await this.axiosInstance.get("/id")).data);
      const form = $("#submit-form");
      if (form.length === 0) throw new Error("Form tidak ditemukan.");
      this.formFields.url = form.find('input[type="text"][required][name]').attr("name");
      this.formFields.tokenName = form.find('input[type="hidden"][name][value]').not('input[name="verify"]').attr("name");
      this.formFields.tokenValue = form.find(`input[name="${this.formFields.tokenName}"]`).attr("value");
      if (!this.formFields.url || !this.formFields.tokenName || !this.formFields.tokenValue) {
        throw new Error("Field form atau token dinamis tidak ditemukan.");
      }
      console.log("Data form berhasil diambil.");
      return true;
    } catch (e) {
      console.error("Kesalahan init:", e.message);
      return false;
    }
  }
  async _req(url, ep) {
    if (!await this._init()) return {
      status: "error",
      message: "Inisialisasi gagal."
    };
    const postData = {
      [this.formFields.url]: url,
      [this.formFields.tokenName]: this.formFields.tokenValue,
      verify: 1
    };
    try {
      console.log(`Mengirim request ke ${ep}...`);
      const res = await this.axiosInstance.post(ep, qs.stringify(postData), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/id`
        }
      });
      return cheerio.load(res.data);
    } catch (e) {
      console.error(`Kesalahan request ke ${ep}:`, e.message);
      return {
        status: "error",
        message: e.message,
        details: e.response?.data
      };
    }
  }
  async download({
    url
  }) {
    console.log(`Mengambil detail konten untuk ${url}...`);
    const $page = await this._req(url, "/id/download");
    if (typeof $page === "object" && "status" in $page) return $page;
    const info = {
      author: $page(".video-author b").text().trim() || "Tidak Diketahui",
      desc: $page(".video-desc").text().trim() || "Tanpa Deskripsi",
      thumb: $page(".video-header.bg-overlay").attr("style")?.match(/url\((.*?)\)/)?.[1] || "Tidak Tersedia",
      avatar: $page(".img-area img").attr("src") || "Tidak Tersedia"
    };
    const links = {
      video: [],
      mp3: [],
      photos: []
    };
    $page("button.download#SlideButton").each((_idx, el) => {
      const buttonText = $page(el).text().trim();
      if (buttonText.includes("Convert Video Now")) {}
    });
    $page("a.download[data-event='mp3_download_click']").each((_idx, el) => {
      const link = $page(el).attr("href");
      if (link) {
        links.mp3.push({
          text: $page(el).text().trim(),
          url: link
        });
      }
    });
    $page("a.download:not([data-event='mp3_download_click']):not(#SlideButton)").each((_idx, el) => {
      const link = $page(el).attr("href");
      if (link) {}
    });
    $page(".row .col.s12.m3 .card .card-action.center a.btn.waves-effect.waves-light.orange").each((_idx, el) => {
      const link = $page(el).attr("href");
      if (link) {
        links.photos.push({
          text: $page(el).text().trim(),
          url: link
        });
      }
    });
    $page('a.download[data-event="video_convert_click"]').each((_idx, el) => {
      const link = $page(el).attr("href");
      if (link && link.includes("fastdl.muscdn.app")) {
        links.video.push({
          text: $page(el).text().trim(),
          url: link
        });
      }
    });
    const audioSource = $page("audio source").attr("src");
    if (audioSource && !links.mp3.some(link => link.url === audioSource)) {
      links.mp3.push({
        text: "Audio Source (Fallback)",
        url: audioSource
      });
    }
    console.log("Detail konten dan tautan berhasil ditemukan.");
    return {
      status: "sukses",
      info: info,
      links: links
    };
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
    const downloader = new TikTokDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}