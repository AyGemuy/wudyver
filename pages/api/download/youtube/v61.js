import axios from "axios";
import Encoder from "@/lib/encoder";
class YtDownloader {
  constructor() {
    this.base = "https://ytmp3.lat/";
    this.api = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: this.base.slice(0, -1),
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K)..."
      },
      timeout: 1e4
    });
    this.api.interceptors.request.use(config => {
      config.headers.referer = this.base;
      console.log(`[📤 REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });
    this.api.interceptors.response.use(response => {
      console.log(`[📥 RESPONSE] Status: ${response.status}`);
      return response;
    }, error => {
      console.error(`[❌ RESPONSE ERROR] ${error.message}`);
      return Promise.reject(error);
    });
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  randomHex(len = 32) {
    const chars = "0123456789abcdef";
    return Array.from({
      length: len
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  encodeCharCodes(txt) {
    return txt.split("").map(c => c.charCodeAt()).reverse().join();
  }
  xorEncode(txt) {
    return txt.split("").map(c => String.fromCharCode(c.charCodeAt() ^ 1)).join("");
  }
  async download({
    url,
    format = "mp3"
  }) {
    console.log("⬇️ [DOWNLOAD] Mulai inisialisasi...");
    if (!url?.trim()) throw new Error("URL tidak boleh kosong");
    const formatCode = {
      mp3: 0,
      mp4: 1
    } [format];
    if (formatCode === undefined) throw new Error('Format hanya "mp3" atau "mp4"');
    const encUrl = this.encodeCharCodes(url);
    const encPayload = this.xorEncode(url);
    const h1 = this.randomHex(32),
      h2 = this.randomHex(32);
    const apiUrl = `${h1}/init/${encUrl}/${h2}/`;
    const body = {
      data: encPayload,
      format: String(formatCode),
      referer: ""
    };
    try {
      const res = await this.api.post(apiUrl, body);
      const {
        i,
        s,
        t,
        le,
        e
      } = res.data;
      if (e) throw new Error("Gagal inisialisasi");
      if (le) throw new Error("Video lebih dari 30 menit");
      if (!i || !s) throw new Error("Respon inisialisasi tidak valid");
      const initData = {
        ...res.data,
        format: format
      };
      const task_id = await this.enc(initData);
      console.log("✅ [TASK ID DIBUAT]");
      return {
        task_id: task_id
      };
    } catch (err) {
      console.error("❌ [DOWNLOAD ERROR]", err.message);
      throw err;
    }
  }
  async status({
    task_id
  }) {
    console.log("📡 [STATUS] Memeriksa status...");
    try {
      const data = await this.dec(task_id);
      const h1 = this.randomHex(32),
        h2 = this.randomHex(32);
      const url = `${h1}/status/${data.i}/${h2}/`;
      const res = await this.api.post(url, {
        data: data.i
      });
      if (res.data.e) throw new Error("Konversi gagal");
      if (res.data.le) throw new Error("Video terlalu panjang");
      if (res.data.s !== "C") throw new Error("⏳ Belum selesai diproses");
      console.log("✅ [STATUS] Konversi selesai!");
      return this.buildDownloadLink({
        ...res.data,
        format: data.format
      });
    } catch (err) {
      console.error("❌ [STATUS ERROR]", err.message);
      throw err;
    }
  }
  buildDownloadLink(data) {
    const h1 = this.randomHex(32),
      h2 = this.randomHex(32);
    const encId = this.xorEncode(data.i);
    const url = `${h1}/download/${encId}/${h2}/`;
    console.log("🔗 [DOWNLOAD LINK]:", this.base + url);
    return {
      url: this.base + url,
      title: data.t || "(no title)",
      format: data.format
    };
  }
}
export default async function handler(req, res) {
  const input = req.method === "GET" ? req.query : req.body;
  const action = input.action || "download";
  const params = {
    ...input
  };
  const client = new YtDownloader();
  try {
    let result;
    switch (action) {
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await client.download({
          url: params.url,
          format: params.format || "mp4"
        });
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id (required for ${action})`
          });
        }
        result = await client.status({
          task_id: params.task_id
        });
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: download | status`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}