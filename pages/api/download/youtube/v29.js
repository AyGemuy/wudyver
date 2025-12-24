import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
import WebSocket from "ws";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class AMDL {
  constructor() {
    this.api = {
      base: {
        video: "https://amp4.cc",
        audio: "https://amp3.cc"
      }
    };
    this.headers = {
      Accept: "application/json",
      "User-Agent": "Downloader/1.0.0"
    };
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.ytRegex = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/;
    this.formats = {
      video: ["144p", "240p", "360p", "480p", "720p", "1080p"],
      audio: ["64k", "128k", "192k", "256k", "320k"]
    };
  }
  async hashChallenge(salt, number, algorithm) {
    return crypto.createHash(algorithm.toLowerCase()).update(salt + number).digest("hex");
  }
  async verifyChallenge(challengeData, salt, algorithm, maxNumber) {
    for (let i = 0; i <= maxNumber; i++) {
      if (await this.hashChallenge(salt, i, algorithm) === challengeData) {
        return {
          number: i,
          took: Date.now()
        };
      }
    }
    throw new Error("Captcha verification failed.");
  }
  async solveCaptcha(challenge) {
    const {
      algorithm,
      challenge: challengeData,
      salt,
      maxnumber,
      signature
    } = challenge;
    const solution = await this.verifyChallenge(challengeData, salt, algorithm, maxnumber);
    return Buffer.from(JSON.stringify({
      algorithm: algorithm,
      challenge: challengeData,
      number: solution.number,
      salt: salt,
      signature: signature,
      took: solution.took
    })).toString("base64");
  }
  async isUrl(url) {
    if (!url) {
      return {
        status: false,
        code: 400,
        result: {
          error: "URL tidak valid."
        }
      };
    }
    if (!this.ytRegex.test(url)) {
      return {
        status: false,
        code: 400,
        result: {
          error: "URL bukan tautan YouTube yang valid."
        }
      };
    }
    return {
      status: true,
      code: 200,
      id: url.match(this.ytRegex)[3]
    };
  }
  async convert(url, format, quality, isAudio = false) {
    try {
      const linkx = await this.isUrl(url);
      if (!linkx.status) return linkx;
      const formatx = isAudio ? this.formats.audio : this.formats.video;
      if (!quality || !formatx.includes(quality)) {
        return {
          status: false,
          code: 400,
          result: {
            error: "Format tidak tersedia.",
            available_fmt: formatx
          }
        };
      }
      const fixedURL = `https://youtu.be/${linkx.id}`;
      const base = isAudio ? this.api.base.audio : this.api.base.video;
      const pages = await this.client.get(`${base}/`);
      const $ = cheerio.load(pages.data);
      const csrfToken = $('meta[name="csrf-token"]').attr("content");
      if (!csrfToken) {
        return {
          status: false,
          code: 500,
          result: {
            error: "Token CSRF tidak ditemukan."
          }
        };
      }
      const form = new FormData();
      form.append("url", fixedURL);
      form.append("format", format);
      form.append("quality", quality);
      form.append("service", "youtube");
      if (isAudio) form.append("playlist", "false");
      form.append("_token", csrfToken);
      const captchaX = await this.client.get(`${base}/captcha`, {
        headers: {
          ...this.headers,
          Origin: base,
          Referer: `${base}/`
        }
      });
      if (captchaX.data) {
        const solvedCaptcha = await this.solveCaptcha(captchaX.data);
        form.append("altcha", solvedCaptcha);
      }
      const endpoint = isAudio ? "/convertAudio" : "/convertVideo";
      const res = await this.client.post(`${base}${endpoint}`, form, {
        headers: {
          ...form.headers,
          ...this.headers,
          Origin: base,
          Referer: `${base}/`
        }
      });
      if (!res.data.success) {
        return {
          status: false,
          code: 400,
          result: {
            error: res.data.message
          }
        };
      }
      const ws = await this.connect(res.data.message, isAudio);
      const dlink = `${base}/dl/${ws.worker}/${res.data.message}/${encodeURIComponent(ws.file)}`;
      return {
        status: true,
        code: 200,
        result: {
          title: ws.title || "Tidak diketahui",
          type: isAudio ? "audio" : "video",
          format: format,
          thumbnail: ws.thumbnail || `https://i.ytimg.com/vi/${linkx.id}/maxresdefault.jpg`,
          download: dlink,
          id: linkx.id,
          duration: ws.duration,
          quality: quality,
          uploader: ws.uploader
        }
      };
    } catch (error) {
      return {
        status: false,
        code: 500,
        result: {
          error: "Terjadi kesalahan dalam konversi."
        }
      };
    }
  }
  async connect(id, isAudio = false) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://${isAudio ? "amp3" : "amp4"}.cc/ws`, ["json"], {
        headers: {
          ...this.headers,
          Origin: `https://${isAudio ? "amp3" : "amp4"}.cc`
        },
        rejectUnauthorized: false
      });
      let fileInfo = {};
      let timeoutId = setTimeout(() => {
        ws.close();
        reject({
          status: false,
          code: 408,
          result: {
            error: "Koneksi timeout."
          }
        });
      }, 3e4);
      ws.on("open", () => ws.send(id));
      ws.on("message", data => {
        const res = JSON.parse(data);
        if (res.event === "query" || res.event === "queue") {
          fileInfo = {
            thumbnail: res.thumbnail,
            title: res.title,
            duration: res.duration,
            uploader: res.uploader
          };
        } else if (res.event === "file" && res.done) {
          clearTimeout(timeoutId);
          ws.close();
          resolve({
            ...fileInfo,
            ...res
          });
        }
      });
      ws.on("error", err => {
        clearTimeout(timeoutId);
        reject({
          status: false,
          code: 500,
          result: {
            error: "Terjadi kesalahan saat menghubungkan."
          }
        });
      });
    });
  }
  async download({
    url,
    format = "720p"
  }) {
    try {
      const isAudio = format === "mp3";
      return await this.convert(url, isAudio ? "mp3" : "mp4", isAudio ? "128k" : format, isAudio);
    } catch (error) {
      return {
        status: false,
        code: 500,
        result: {
          error: "Terjadi kesalahan saat mengunduh."
        }
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
  const amdl = new AMDL();
  try {
    const data = await amdl.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}