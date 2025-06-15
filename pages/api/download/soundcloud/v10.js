import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
class SoundcloudMe {
  constructor() {
    this.api = {
      base: "https://www.soundcloudme.com",
      endpoint: {
        download: "/downloader",
        process: "/sc_.php",
        playlist: "/soundcloud-playlist-downloader"
      }
    };
    this.headers = {
      authority: "www.soundcloudme.com",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://www.soundcloudme.com",
      "user-agent": "Mozilla/5.0"
    };
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      timeout: 3e4,
      validateStatus: s => s >= 200 && s < 500,
      responseType: "arraybuffer"
    }));
    this.regex = {
      track: /^https?:\/\/(m\.)?(soundcloud\.com)\/(.*)\/([^\/]+)$/,
      playlist: /^https?:\/\/(m\.)?(soundcloud\.com)\/(.*)\/sets\/([^\/]+)$/
    };
  }
  async getVerifyToken() {
    try {
      const res = await this.client.get(this.api.base, {
        headers: {
          ...this.headers,
          referer: `${this.api.base}/?s=Hit`
        },
        responseType: "text"
      });
      const $ = cheerio.load(res.data);
      const token = $('input[name="downloader_verify"]').val();
      if (!token) throw new Error("Verify token not found.");
      return {
        success: true,
        code: 200,
        result: {
          token: token
        }
      };
    } catch {
      return {
        success: false,
        code: 400,
        result: {
          error: "Gagal ambil token verifikasi. Coba lagi nanti."
        }
      };
    }
  }
  async isUrl(url, type = "track") {
    if (!url) {
      return {
        success: false,
        code: 400,
        result: {
          error: "URL tidak boleh kosong."
        }
      };
    }
    const regex = this.regex[type];
    if (!regex.test(url)) {
      return {
        success: false,
        code: 400,
        result: {
          error: type === "playlist" ? "Link playlist Soundcloud tidak valid." : "Link track Soundcloud tidak valid."
        }
      };
    }
    return {
      success: true,
      code: 200,
      result: {
        url: url
      }
    };
  }
  parseTrackMeta($) {
    return {
      title: $("h3").first().text().trim(),
      image: $("#soundcloud-area img").first().attr("src"),
      form: {
        nonce: $('input[name="_nonce"]').val(),
        title: $('input[name="title"]').val(),
        yt: $('input[name="yt"]').val()
      }
    };
  }
  parsePlaylistMeta($) {
    const tracks = [];
    $(".custom-track-container").each((i, el) => {
      const $track = cheerio.load(el);
      tracks.push({
        title: $track(".custom-track-title").text().trim(),
        image: $track(".custom-track-image").attr("src"),
        duration: $track('.custom-track-detail:contains("Duration")').text().replace("Duration:", "").trim(),
        likes: parseInt($track('.custom-track-detail:contains("Likes")').text().replace("Likes:", "").replace(/,/g, "").trim()),
        url: $track(".custom-download-btn").attr("href")
      });
    });
    return tracks;
  }
  async dlTrack(url) {
    try {
      const valid = await this.isUrl(url);
      if (!valid.success) return valid;
      const tokenRes = await this.getVerifyToken();
      if (!tokenRes.success) return tokenRes;
      const form = new FormData();
      form.append("downloader_verify", tokenRes.result.token);
      form.append("_wp_http_referer", "/");
      form.append("url", url);
      const res = await this.client.post(this.api.base + this.api.endpoint.download, form, {
        headers: {
          ...form.headers,
          ...this.headers,
          referer: this.api.base
        },
        responseType: "text"
      });
      const $ = cheerio.load(res.data);
      const metadata = this.parseTrackMeta($);
      if (!metadata.form.nonce || !metadata.form.yt) {
        return {
          success: false,
          code: 400,
          result: {
            title: metadata.title,
            image: metadata.image,
            error: "Gagal memproses audio. Form tidak lengkap."
          }
        };
      }
      const params = new URLSearchParams({
        _nonce: metadata.form.nonce,
        _wp_http_referer: "/downloader",
        action: "download_mp3",
        title: metadata.form.title,
        yt: metadata.form.yt
      });
      const download = await this.client.post(this.api.base + this.api.endpoint.process, params, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          referer: this.api.base + this.api.endpoint.download
        },
        responseType: "arraybuffer"
      });
      if (!download.data?.length) {
        return {
          success: false,
          code: 400,
          result: {
            title: metadata.title,
            image: metadata.image,
            error: "Download gagal. File kosong."
          }
        };
      }
      const base64 = Buffer.from(download.data).toString("base64");
      return {
        success: true,
        code: 200,
        result: {
          title: metadata.title,
          image: metadata.image,
          file: base64
        }
      };
    } catch {
      return {
        success: false,
        code: 400,
        result: {
          error: "Terjadi kesalahan saat proses download."
        }
      };
    }
  }
  async dlPlaylist(url) {
    try {
      const valid = await this.isUrl(url, "playlist");
      if (!valid.success) return valid;
      const tokenRes = await this.getVerifyToken();
      if (!tokenRes.success) return tokenRes;
      const form = new FormData();
      form.append("downloader_verify", tokenRes.result.token);
      form.append("_wp_http_referer", this.api.endpoint.playlist);
      form.append("url", url);
      const res = await this.client.post(this.api.base + this.api.endpoint.download, form, {
        headers: {
          ...form.headers,
          ...this.headers,
          referer: this.api.base + this.api.endpoint.playlist
        },
        responseType: "text"
      });
      const $ = cheerio.load(res.data);
      const tracks = this.parsePlaylistMeta($);
      if (!tracks.length) {
        return {
          success: false,
          code: 404,
          result: {
            error: "Playlist kosong. Tidak ada track ditemukan."
          }
        };
      }
      return {
        success: true,
        code: 200,
        result: {
          tracks: tracks
        }
      };
    } catch {
      return {
        success: false,
        code: 400,
        result: {
          error: "Terjadi kesalahan saat mengambil data playlist."
        }
      };
    }
  }
  async download(url) {
    return this.regex.playlist.test(url) ? await this.dlPlaylist(url) : await this.dlTrack(url);
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundcloudMe();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}