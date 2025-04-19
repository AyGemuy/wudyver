import axios from "axios";
import {
  FormData
} from "formdata-node";
class SnapSave {
  constructor() {
    this.api = {
      base: "https://snapsave.app",
      download: "/action.php?lang=id"
    };
    this.headers = {
      authority: "snapsave.app",
      origin: "https://snapsave.app",
      referer: "https://snapsave.app/id",
      "user-agent": "Postify/1.0.0"
    };
    this.regex = {
      instagram: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv|stories)\/([^/?#&]+)/i,
      facebook: /^https?:\/\/(www\.|web\.|m\.)?(facebook\.com|fb\.watch|fb\.com)\/.+/i,
      tiktok: /^https?:\/\/((?:vm|vt|www|m)\.)?tiktok\.com\/.+/i
    };
  }
  isPlatform(url) {
    if (!url) return null;
    for (const [platform, pattern] of Object.entries(this.regex)) {
      if (pattern.test(url)) return platform;
    }
    return null;
  }
  decode(h, u, n, t, e) {
    let result = "";
    const charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
    for (let i = 0; i < h.length; i++) {
      let segment = "";
      while (i < h.length && h[i] !== n[e]) segment += h[i++];
      for (let j = 0; j < n.length; j++) {
        segment = segment.replace(new RegExp(n[j], "g"), j.toString());
      }
      try {
        let decimal = segment.split("").reverse().reduce((acc, char, idx) => {
          const charIndex = charset.slice(0, e).indexOf(char);
          return charIndex !== -1 ? acc + charIndex * Math.pow(e, idx) : acc;
        }, 0);
        const charCode = decimal - t;
        if (charCode >= 0) result += String.fromCharCode(charCode);
      } catch (err) {
        return {
          status: false,
          code: 500,
          result: {
            error: "Decodenya gagal bree 🤫",
            message: err.message
          }
        };
      }
    }
    try {
      return {
        status: true,
        code: 200,
        result: {
          media: decodeURIComponent(escape(result))
        }
      };
    } catch (err) {
      return {
        status: true,
        code: 200,
        result: {
          media: result
        }
      };
    }
  }
  extract(media, platform) {
    try {
      const mediax = {
        image: [],
        video: [],
        thumbnail: null
      };
      const section = media.match(/download-section"\).innerHTML = "(.*?)";/);
      if (!section) return {
        status: false,
        code: 404,
        result: {
          error: "Section Downloadnya kagak ada bree 😬",
          media: null
        }
      };
      const mediax_raw = section[1].replace(/\\"/g, '"').replace(/\\\//g, "/");
      const thumb = mediax_raw.match(/<img src="([^"]+)"/);
      if (thumb) mediax.thumbnail = thumb[1];
      const title = mediax_raw.match(/<strong>(.*?)<\/strong>/);
      const filename = title ? title[1] : "media";
      if (platform === "facebook" || platform === "instagram") {
        const urlRegex = /https:\/\/d\.rapidcdn\.app\/d\?token=[^"]+/g;
        const b = mediax_raw.matchAll(urlRegex);
        for (const match of b) {
          const url = match[0];
          const toket = JSON.parse(Buffer.from(url.split("token=")[1].split(".")[1], "base64").toString());
          const items = {
            url: url + "&dl=1",
            filename: filename + (toket.filename.match(/\.[^.]+$/)?.[0] || ""),
            quality: toket.quality || "SD"
          };
          if (toket.filename.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
            mediax.image.push(items);
          } else if (toket.filename.toLowerCase().endsWith(".mp4")) {
            mediax.video.push(items);
          }
        }
      } else if (platform === "tiktok") {
        const urlRegex = /https:\/\/snapxcdn\.com\/v2\/\?token=[^&]+/g;
        const b = media.match(urlRegex);
        if (b) {
          b.forEach(match => {
            mediax.video.push({
              url: match,
              filename: `${filename}.mp4`,
              quality: "HD"
            });
          });
        }
      }
      return {
        status: true,
        code: 200,
        result: {
          error: "Success",
          media: mediax
        }
      };
    } catch (error) {
      return {
        status: false,
        code: 500,
        result: {
          error: "Link Medianya kagak bisa diekstrak bree 🤷🏻",
          message: error.message
        }
      };
    }
  }
  async download(url) {
    if (!url) return {
      status: false,
      code: 400,
      result: {
        error: "Linknya mana? Niat download kagak sih? 🗿"
      }
    };
    const platform = this.isPlatform(url);
    if (!platform) return {
      status: false,
      code: 400,
      result: {
        error: "Linknya kagak valid tuh.. cobalah input yang bener 🗿"
      }
    };
    try {
      const formData = new FormData();
      formData.append("url", url);
      const response = await axios.post(`${this.api.base}${this.api.download}`, formData, {
        headers: this.headers
      });
      const b = response.data.match(/eval\(function\(h,u,n,t,e,r\){.*?"(.*?)",(\d+),"(.*?)",(\d+),(\d+),(\d+)\)\)/);
      if (!b) return {
        status: false,
        code: 404,
        result: {
          error: "Data encodenya kagak ada bree 🙃"
        }
      };
      const [_, encodedStr, u, n, t, e] = b;
      const decoded = this.decode(encodedStr, parseInt(u), n, parseInt(t), parseInt(e));
      if (!decoded.status) return decoded;
      const medias = this.extract(decoded.result.media, platform);
      if (!medias.status) return medias;
      return {
        status: true,
        code: 200,
        result: {
          platform: platform,
          media: medias.result.media
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No URL provided"
  });
  try {
    const downloader = new SnapSave();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}