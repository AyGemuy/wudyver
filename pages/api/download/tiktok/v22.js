import axios from "axios";
import crypto from "crypto";
class DexLoader {
  constructor() {
    this.CONFIG = {
      KEY: "owen!guo!0613!raul!888",
      UA: "Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/117.0.0.0 Mobile Safari/537.36",
      ENDPOINTS: {
        TT: "https://api.ocean-downloader.com/v1/tt/parse_media",
        IG: "https://api2.ocean-downloader.com/v1/ig/parse_media"
      }
    };
  }
  sign(payload) {
    return crypto.createHmac("sha256", this.CONFIG.KEY).update(payload).digest("hex");
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async download({
    url,
    type
  } = {}) {
    if (!url || typeof url !== "string") {
      console.error("[Error] URL tidak valid atau kosong.");
      return {
        error: true,
        msg: "Invalid URL"
      };
    }
    const endpoint = {
      tt: this.CONFIG.ENDPOINTS.TT,
      ig: this.CONFIG.ENDPOINTS.IG
    } [type] || (url.includes("instagram.com") ? this.CONFIG.ENDPOINTS.IG : this.CONFIG.ENDPOINTS.TT);
    const MAX_ATTEMPTS = 30;
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      console.log(`\n[Log] Attempt ${i}/${MAX_ATTEMPTS}: ${url.substring(0, 40)}...`);
      try {
        const payloadData = {
          url: url,
          ts: Date.now()
        };
        const rawBody = JSON.stringify(payloadData);
        const signature = this.sign(rawBody);
        const response = await axios.post(endpoint, rawBody, {
          headers: {
            "User-Agent": this.CONFIG.UA,
            "Content-Type": "application/json; charset=utf-8",
            sign: signature
          },
          timeout: 15e3
        });
        if (response?.data) {
          console.log(`[Log] Success! Data received.`);
          return response.data;
        } else {
          throw new Error("Response kosong tapi status 200 OK");
        }
      } catch (error) {
        const status = error.response?.status || "NoStatus";
        const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Unknown Error";
        console.error(`[Log] Failed (${status}): ${errMsg}`);
        if (i === MAX_ATTEMPTS) {
          return {
            error: true,
            msg: `Gagal setelah ${MAX_ATTEMPTS}x percobaan. Terakhir: ${errMsg}`
          };
        }
        await this.delay(1500);
      }
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
  const api = new DexLoader();
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