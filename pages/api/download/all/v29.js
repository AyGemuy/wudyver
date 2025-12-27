import axios from "axios";
import crypto from "node:crypto";
class Seekin {
  constructor() {
    this.k = "3HT8hjE79L";
    this.api = "https://api.seekin.ai/ikool/media/download";
  }
  ts() {
    return Date.now().toString();
  }
  sas(n) {
    return !n || typeof n !== "object" ? "" : Object.keys(n).sort().map(a => `${a}=${n[a]}`).join("&");
  }
  gs(l, t, d) {
    const r = this.sas(d);
    const p = `${l}${t}${this.k}${r}`;
    return crypto.createHash("sha256").update(p).digest("hex");
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[PROSES] Menyiapkan request untuk: ${url?.slice(0, 30)}...`);
      const l = rest?.lang || "en";
      const t = this.ts();
      const body = {
        url: url || ""
      };
      const s = this.gs(l, t, body);
      console.log(`[PROSES] Sign berhasil dibuat: ${s}`);
      const res = await axios.post(this.api, body, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          lang: l,
          origin: "https://www.seekin.ai",
          referer: "https://www.seekin.ai/",
          sign: s,
          timestamp: t,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log(`[PROSES] Data berhasil didapatkan`);
      return {
        result: res?.data?.data || res?.data
      };
    } catch (err) {
      console.error(`[ERROR] Detail: ${err?.message}`);
      return {
        result: null,
        error: err?.response?.data || err?.message
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
  const api = new Seekin();
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