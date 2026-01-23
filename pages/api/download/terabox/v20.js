import axios from "axios";
import crypto from "crypto";
class TeraDownloader {
  constructor() {
    this.ep = "https://digittechstore.com/proxy.php";
    this.sec = "YMG_SECRATE";
    this.ua = "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)";
    this.max = 5;
  }
  _sign(bodyStr, ts) {
    try {
      const data = bodyStr + ts;
      const hmac = crypto.createHmac("sha256", this.sec);
      hmac.update(data);
      return hmac.digest("base64");
    } catch (e) {
      console.log("[!] Error signing:", e.message);
      return "";
    }
  }
  _fmt(url) {
    const s = url.match(/[?&]surl=([\w-]+)/);
    const p = url.match(/\/s\/([\w-]+)/);
    return s ? `https://terabox.com/s/1${s[1]}` : p ? `https://terabox.com/s/${p[1]}` : null;
  }
  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async _req(url, attempt = 1) {
    try {
      console.log(`[LOG] Memproses URL: ${url} | Percobaan ke-${attempt}`);
      const ts = Date.now().toString();
      const payload = {
        link: this._fmt(url)
      };
      const bodyStr = JSON.stringify(payload);
      const sign = this._sign(bodyStr, ts);
      const headers = {
        "User-Agent": this.ua,
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-signature": sign,
        "x-ts": ts
      };
      const {
        data
      } = await axios.post(this.ep, payload, {
        headers: headers
      });
      console.log("[LOG] Berhasil mendapatkan data video.");
      return {
        ok: true,
        ...data
      };
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || "Unknown error";
      console.log(`[ERR] Percobaan ${attempt} gagal: ${errMsg}`);
      if (attempt < this.max) {
        const delay = Math.pow(2, attempt) * 500;
        console.log(`[WAIT] Menunggu ${delay}ms sebelum mencoba kembali...`);
        await this._wait(delay);
        return this._req(url, attempt + 1);
      }
      return {
        ok: false,
        msg: "Gagal mengambil data setelah 5x percobaan.",
        error: errMsg
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    if (!url || typeof url !== "string") {
      return {
        ok: false,
        msg: "URL tidak valid"
      };
    }
    console.log("--- START PROCESS ---");
    const result = await this._req(url);
    return result.ok ? {
      status: "SUCCESS",
      ...result,
      ...rest
    } : {
      status: "FAILED",
      ...result
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TeraDownloader();
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