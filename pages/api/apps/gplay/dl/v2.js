import axios from "axios";
import https from "https";
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false
});
const browserHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Origin: "https://sniff.xhyrom.dev",
  Referer: "https://sniff.xhyrom.dev/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin"
};
class GStore {
  constructor() {
    this.epDetail = "https://sniff.xhyrom.dev/v1/details/";
    this.epDown = "https://sniff.xhyrom.dev/v1/download/";
    this.client = axios.create({
      httpsAgent: httpsAgent,
      headers: browserHeaders,
      timeout: 3e4
    });
  }
  pid(str) {
    if (!str) return null;
    const match = str.match(/id=([a-zA-Z0-9_.]+)/);
    return match ? match[1] : str.trim();
  }
  async info(id, channel = "stable") {
    const url = `${this.epDetail}${id}/${channel}`;
    console.log(`[GStore] Fetch details → ${id} [${channel}]`);
    try {
      const {
        data
      } = await this.client.get(url);
      if (!data.success) return {
        success: false,
        error: data.error
      };
      return {
        success: true,
        data: data.data,
        channel: channel
      };
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      console.error(`[GStore] Details error [${channel}]: ${msg}`);
      return {
        success: false,
        error: msg
      };
    }
  }
  async download({
    url,
    package_name,
    channel = "stable",
    version_code
  } = {}) {
    const id = this.pid(url || package_name);
    if (!id) throw new Error("Package ID atau URL wajib diisi!");
    console.log(`\n[GStore] Download → ${id} | channel: ${channel}`);
    let versionCode = version_code;
    let usedChannel = channel;
    let details = null;
    if (!versionCode) {
      console.log("[GStore] Version code kosong → auto detect...");
      let res = await this.info(id, channel);
      if (!res.success && channel !== "stable") {
        console.log(`[GStore] Channel "${channel}" tidak tersedia → fallback ke stable`);
        res = await this.info(id, "stable");
        usedChannel = "stable";
      }
      if (!res.success) {
        return {
          success: false,
          message: "Gagal ambil details (bahkan stable)",
          download: null
        };
      }
      details = res.data;
      let item;
      if (details?.[usedChannel]?.item) {
        item = details[usedChannel].item;
      } else if (details?.item) {
        item = details.item;
      } else {
        return {
          success: false,
          message: "Struktur details tidak dikenali",
          download: null,
          details: details
        };
      }
      versionCode = item?.details?.app_details?.version_code;
      if (!versionCode) {
        return {
          success: false,
          message: "Version code tidak ditemukan di details",
          download: null,
          details: details
        };
      }
      console.log(`[GStore] Version otomatis → ${versionCode} (${usedChannel})`);
    }
    const downloadUrl = `${this.epDown}${id}/${usedChannel}/${versionCode}`;
    console.log(`[GStore] Request download → ${downloadUrl}`);
    try {
      const {
        data
      } = await this.client.get(downloadUrl);
      if (!data.success) {
        return {
          success: false,
          message: data.error || "Download gagal",
          download: null
        };
      }
      return {
        success: true,
        version_code: versionCode,
        channel: usedChannel,
        details: details || undefined,
        download: data.data
      };
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      return {
        success: false,
        message: msg,
        download: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new GStore();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}