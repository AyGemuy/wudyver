import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar: jar
}));
class APIDL {
  constructor() {
    this.headers = {
      "User-Agent": "Postify/1.0.0",
      Origin: "https://apidl.net",
      Referer: "https://apidl.net/"
    };
  }
  validateInput(link) {
    if (!link || link.trim().length === 0) throw new Error("Link tidak ditemukan.");
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})$/;
    if (!regex.test(link)) throw new Error("Bukan link YouTube yang valid.");
  }
  async download(url, format = "mp4", quality = "720") {
    this.validateInput(url);
    const id = url.match(/([a-zA-Z0-9_-]{11})/);
    if (!id) throw new Error("ID video tidak ditemukan.");
    const vid = id[1];
    const response = await client.get(`https://rr-01-bucket.cdn1313.net/api/v4/info/${vid}`, {
      headers: this.headers
    });
    const videoInfo = response.data;
    const auth = response.headers.authorization;
    if (!videoInfo || !videoInfo.formats) throw new Error("Tidak ada informasi video.");
    let qualities;
    if (format === "mp3") {
      if (!videoInfo.formats.audio || !videoInfo.formats.audio.mp3) throw new Error("Format audio tidak tersedia.");
      qualities = {
        64: videoInfo.formats.audio.mp3[4],
        128: videoInfo.formats.audio.mp3[3],
        192: videoInfo.formats.audio.mp3[2],
        256: videoInfo.formats.audio.mp3[1],
        320: videoInfo.formats.audio.mp3[0]
      };
    } else {
      if (!videoInfo.formats.video || !videoInfo.formats.video.mp4) throw new Error("Format video tidak tersedia.");
      qualities = {
        360: videoInfo.formats.video.mp4[3],
        480: videoInfo.formats.video.mp4[2],
        720: videoInfo.formats.video.mp4[1],
        1080: videoInfo.formats.video.mp4[0]
      };
    }
    if (!qualities[quality]) {
      throw new Error(`Kualitas ${quality} tidak tersedia. Pilih dari: ${Object.keys(qualities).join(", ")}.`);
    }
    const token = qualities[quality].token;
    const convert = await client.post("https://rr-01-bucket.cdn1313.net/api/v4/convert", {
      token: token
    }, {
      headers: {
        ...this.headers,
        Authorization: auth,
        "Content-Type": "application/json"
      }
    });
    const cid = convert.data.id;
    let dlink;
    let retries = 0;
    while (retries < 30) {
      const status = await client.get(`https://rr-01-bucket.cdn1313.net/api/v4/status/${cid}`, {
        headers: {
          ...this.headers,
          Authorization: auth
        }
      });
      if (status.data.status === "completed" || status.data.progress === 100) {
        dlink = status.data.download;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2e3));
      retries++;
    }
    if (!dlink) throw new Error("Gagal mendapatkan link download.");
    return {
      success: true,
      data: {
        title: videoInfo.title,
        format: format,
        quality: quality,
        dlink: dlink
      }
    };
  }
}
export default async function handler(req, res) {
  const downloader = new APIDL();
  const {
    url,
    format = "mp4",
    quality = "720"
  } = req.method === "GET" ? req.query : req.body;
  try {
    const result = await downloader.download(url, format, quality);
    return res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}