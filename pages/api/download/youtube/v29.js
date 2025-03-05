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
class Amdl {
  constructor() {
    this.base = {
      video: "https://amp4.cc",
      audio: "https://amp3.cc"
    };
    this.headers = {
      Accept: "application/json",
      "User-Agent": "Postify/1.0.0"
    };
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.yt = /^(?:https?:)?\/\/(?:www|m|music\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/;
    this.videos = {
      "2160p": "11",
      "1440p": "10",
      "1080p": "9",
      "720p": "8",
      "480p": "7",
      "360p": "6",
      "240p": "5",
      "144p": "0"
    };
    this.audios = ["64k", "128k", "192k", "256k", "320k"];
    this.fps = ["24", "30", "60", "90"];
  }
  async hashChallenge(salt, number, algorithm) {
    return crypto.createHash(algorithm.toLowerCase()).update(salt + number).digest("hex");
  }
  async solve(challenge) {
    const {
      algorithm,
      challenge: challengeData,
      salt,
      maxnumber,
      signature
    } = challenge;
    for (let i = 0; i <= maxnumber; i++) {
      if (await this.hashChallenge(salt, i, algorithm) === challengeData) {
        return Buffer.from(JSON.stringify({
          algorithm: algorithm,
          challenge: challengeData,
          number: i,
          salt: salt,
          signature: signature
        })).toString("base64");
      }
    }
    throw new Error("Gagal bypass captcha");
  }
  async getId(url) {
    if (!this.yt.test(url)) throw new Error("Link tidak valid");
    return url.match(this.yt)[1];
  }
  async fix(url) {
    return `https://youtu.be/${await this.getId(url)}`;
  }
  async getQuality(quality, isAudio = false) {
    return isAudio ? this.audios.includes(quality) ? quality : "192k" : this.videos[quality] || this.videos["720p"];
  }
  async labels(value, isAudio = false) {
    return isAudio ? value : Object.keys(this.videos).find(key => this.videos[key] === value) || "720p";
  }
  fpsx(fps) {
    return this.fps.includes(fps);
  }
  async convert(url, format, quality, isAudio = false, fps = null) {
    const a = await this.fix(url);
    const base = isAudio ? this.base.audio : this.base.video;
    const pageRes = await this.client.get(`${base}/`);
    const $ = cheerio.load(pageRes.data);
    const csrfx = $('meta[name="csrf-token"]').attr("content");
    if (!csrfx) throw new Error("CSRF token tidak ditemukan");
    const form = new FormData();
    form.append("url", a);
    form.append("format", format);
    form.append("quality", await this.getQuality(quality, isAudio));
    form.append("service", "youtube");
    if (fps && !isAudio && this.fpsx(fps)) form.append("fps", fps);
    form.append("_token", csrfx);
    const captcha = await this.client.get(`${base}/captcha`, {
      headers: {
        ...this.headers,
        Origin: base,
        Referer: `${base}/`
      }
    });
    if (captcha.data) {
      form.append("altcha", await this.solve(captcha.data));
    }
    const res = await this.client.post(`${base}/convert`, form, {
      headers: {
        ...this.headers,
        Origin: base,
        Referer: `${base}/`
      }
    });
    if (!res.data.success) throw new Error(res.data.message || "Error");
    return res.data;
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
      ws.on("open", () => ws.send(id));
      ws.on("message", data => {
        const res = JSON.parse(data);
        if (res.event === "file" && res.done) {
          ws.close();
          resolve(res);
        }
      });
      ws.on("error", err => reject(err));
    });
  }
  async download(url, type = "video", quality = null, fps = null) {
    const isAudio = type === "audio";
    quality = quality || (isAudio ? "192k" : "720p");
    const convertx = await this.convert(url, isAudio ? "mp3" : "mp4", quality, isAudio, fps);
    if (!convertx.success) throw new Error(`Gagal convert: ${convertx.message}`);
    const ws = await this.connect(convertx.message, isAudio);
    const base = isAudio ? this.base.audio : this.base.video;
    return {
      type: type,
      title: ws.title || "Unknown",
      quality: isAudio ? quality : await this.labels(quality, isAudio),
      fps: fps || "Default",
      download: `${base}/dl/${ws.worker}/${convertx.message}/${encodeURIComponent(ws.file)}`,
      response: {
        ...convertx,
        ...ws
      }
    };
  }
}
export default async function handler(req, res) {
  const {
    url,
    type = "video",
    quality,
    fps
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "Invalid YouTube URL"
  });
  const amdl = new Amdl();
  try {
    const result = await amdl.download(url, type, quality, fps);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}