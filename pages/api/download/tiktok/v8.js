import axios from "axios";
import * as cheerio from "cheerio";
import WebSocket from "ws";
class TikVid {
  constructor() {
    this.link = "https://tikvid.io";
    this.regex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/\d+|vm\.tiktok\.com\/\w+|vt\.tiktok\.com\/\w+)/;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-MM,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://tikvid.io",
      referer: "https://tikvid.io/",
      "user-agent": "Postify/1.0.0"
    };
  }
  async convert(vid, audio, image, exp, token, url) {
    const params = new URLSearchParams({
      ftype: "mp4",
      v_id: vid,
      audioUrl: audio,
      audioType: "audio/mp3",
      imageUrl: image,
      fquality: "1080p",
      fname: "TikVid.io",
      exp: exp,
      token: token
    });
    try {
      const {
        data
      } = await axios.post(url, params, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  job(jobId) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://s2.tik-cdn.com/sub/${jobId}?fname=TikVid.io`, {
        headers: {
          Origin: "https://tikvid.io",
          "User-Agent": this.headers["user-agent"]
        }
      });
      ws.on("message", data => {
        const message = JSON.parse(data);
        if (message.action === "success") {
          ws.close();
          resolve(message);
        }
      });
      ws.on("error", error => {
        console.error(error);
        reject(error);
      });
      setTimeout(() => {
        ws.close();
        reject(new Error("Proses konversi gambar slide gagal, coba lagi nanti."));
      }, 12e4);
    });
  }
  async download(url) {
    if (!this.regex.test(url)) return {
      error: "Link TikTok tidak valid. Coba gunakan link TikTok yang lain."
    };
    try {
      const {
        data
      } = await axios.post(`${this.link}/api/ajaxSearch`, new URLSearchParams({
        q: url,
        lang: "en"
      }), {
        headers: this.headers
      });
      const $ = cheerio.load(data.data);
      const result = {
        title: $(".tik-video .content h3").text().trim(),
        thumbnail: $(".image-tik img").attr("src"),
        downloads: {
          video: {},
          images: [],
          audio: null
        }
      };
      $(".dl-action a").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        const text = $el.text().trim().toLowerCase();
        if (href && !href.includes("javascript:void(0);")) {
          if (text.includes("mp4")) {
            if (text.includes("hd")) result.downloads.video.hd = href;
            else if (text.includes("[1]")) result.downloads.video.nowm = href;
            else if (text.includes("[2]")) result.downloads.video.wm = href;
          } else if (text.includes("mp3")) result.downloads.audio = href;
        }
      });
      result.downloads.video.source = $("#vid").attr("data-src");
      result.tiktokId = $("#TikTokId").val();
      const sc = $("script").last().html();
      const [, exp] = sc.match(/k_exp\s*=\s*"(\d+)"/) || [];
      const [, token] = sc.match(/k_token\s*=\s*"([a-f0-9]+)"/) || [];
      const [, convertUrl] = sc.match(/k_url_convert\s*=\s*"([^"]+)"/) || [];
      if (exp && token && convertUrl) result.convert = {
        exp: exp,
        token: token,
        convertUrl: convertUrl
      };
      $(".photo-list .download-items").each((_, item) => {
        const $item = $(item);
        result.downloads.images.push({
          thumbnail: $item.find("img").attr("src"),
          dlink: $item.find("a").attr("href")
        });
      });
      if (result.downloads.images.length > 1) {
        const $convertButton = $("#ConvertToVideo");
        if ($convertButton.length) {
          const audio = $convertButton.attr("data-audiourl");
          const imageData = $convertButton.attr("data-imagedata");
          if (result.tiktokId && audio && imageData && result.convert) {
            result.slides = await this.convert(result.tiktokId, audio, imageData, result.convert.exp, result.convert.token, result.convert.convertUrl);
            if (result.slides?.jobId) {
              try {
                result.convertComplete = await this.job(result.slides.jobId);
                result.downloads.video.converted = result.convertComplete.url;
              } catch (error) {
                console.error(error);
                result.error = "Proses konversi gambar slide gagal, coba lagi nanti.";
              }
            }
          }
        }
      }
      if (!Object.keys(result.downloads.video).length) result.downloads.video = null;
      if (!result.downloads.images.length) result.downloads.images = null;
      return result;
    } catch (error) {
      return {
        error: "Terjadi kesalahan. Coba lagi beberapa saat lagi."
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL tidak ditemukan. Pastikan URL TikTok sudah benar."
    });
  }
  const tikVid = new TikVid();
  try {
    const result = await tikVid.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Terjadi kesalahan pada server, coba lagi nanti.",
      details: error.message
    });
  }
}