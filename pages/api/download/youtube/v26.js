import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class Cnvmp3Converter {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.api = {
      base: "https://cnvmp3.com",
      endpoints: {
        info: "/get_video_data.php",
        download: "/download_video_ucep.php"
      }
    };
    this.headers = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://cnvmp3.com",
      referer: "https://cnvmp3.com/v25",
      "user-agent": "Postify/1.0.0"
    };
    this.getQuality = (fmt, value) => {
      if (fmt === 1) {
        const audios = {
          320: 0,
          256: 1,
          192: 2,
          160: 3,
          128: 4,
          96: 5
        };
        return audios[value] ?? null;
      }
      if (fmt === 0) {
        const videos = [144, 360, 480, 720, 1080];
        return videos.includes(value) ? value : null;
      }
      return null;
    };
    this.info = async url => {
      try {
        const res = await this.client.post(`${this.api.base}${this.api.endpoints.info}`, {
          url: url,
          token: "1234"
        }, {
          headers: this.headers,
          timeout: 1e4
        });
        if (res.data?.success && res.data?.title) {
          return {
            success: true,
            code: 200,
            result: {
              title: res.data.title
            }
          };
        }
        return {
          success: false,
          code: 404,
          result: {
            error: "Video title not found."
          }
        };
      } catch (err) {
        return {
          success: false,
          code: err.response?.status || 500,
          result: {
            error: "Request failed.",
            details: err.message
          }
        };
      }
    };
  }
  async download({
    url,
    fmt = 1,
    quality = 128
  }, maxTries = 10, delayMs = 2e3) {
    const q = this.getQuality(fmt, quality);
    if (!url || typeof url !== "string" || !url.includes("youtu")) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Invalid YouTube URL provided."
        }
      };
    }
    if (![0, 1].includes(fmt)) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Invalid format. Format must be 0 (video) or 1 (audio)."
        }
      };
    }
    if (q === null) {
      return {
        success: false,
        code: 400,
        result: {
          error: fmt === 1 ? "Invalid audio bitrate. Supported bitrates: 96-320 kbps." : "Invalid video resolution. Supported resolutions: 144, 360, 480, 720, 1080."
        }
      };
    }
    const infoResult = await this.info(url);
    if (!infoResult.success) {
      return infoResult;
    }
    const payload = {
      url: url,
      title: infoResult.result.title,
      quality: q,
      formatValue: fmt
    };
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const res = await this.client.post(`${this.api.base}${this.api.endpoints.download}`, payload, {
          headers: this.headers,
          timeout: 2e4,
          validateStatus: s => s === 200
        });
        const dlink = res.data?.download_link;
        if (!dlink || typeof dlink !== "string" || dlink.trim() === "") {
          if (attempt < maxTries) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          return {
            success: false,
            code: 422,
            result: {
              error: "Download link not found or invalid after multiple attempts."
            }
          };
        }
        return {
          success: true,
          code: 200,
          result: {
            type: fmt === 1 ? "audio" : "video",
            title: infoResult.result.title,
            quality: quality,
            attempt: attempt,
            dlink: dlink
          }
        };
      } catch (err) {
        if (attempt < maxTries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          return {
            success: false,
            code: err.response?.status || 500,
            result: {
              error: "Download request failed after multiple attempts.",
              details: err.message
            }
          };
        }
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    error: "Input YouTube URL"
  });
  try {
    const converter = new Cnvmp3Converter();
    const result = await converter.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}