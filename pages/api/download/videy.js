import axios from "axios";
class Videy {
  constructor() {
    this.h = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://videy.co/",
      Origin: "https://videy.co"
    };
    this.cdn = "https://cdn.videy.co";
  }
  sz(b) {
    const i = b > 0 ? Math.floor(Math.log(b) / Math.log(1024)) : 0;
    return `${(b / Math.pow(1024, i)).toFixed(2)} ${"BKMGTPY"[i]}${i > 0 ? "B" : ""}`;
  }
  l(d) {
    return !d || d.length === 8 || d.length === 9 && d.endsWith("1") ? "mp4" : d.length === 9 && d.endsWith("2") ? "mov" : "mp4";
  }
  pid(u) {
    const s = u?.trim() || "";
    const q = s.match(/[?&]id=([^&]+)/)?.[1];
    return q || s.split("/").filter(Boolean).pop()?.split(".")[0] || "";
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[LOG] Memproses: ${url}`);
    try {
      const i = this.pid(url);
      if (!i || i.length < 5) throw new Error("ID_NOT_FOUND");
      const ext = this.l(i);
      const dl = `${this.cdn}/${i}.${ext}`;
      console.log(`[LOG] Validasi HEAD: ${dl}`);
      const res = await axios.head(dl, {
        headers: this.h,
        timeout: 1e4,
        ...rest
      });
      const h = res?.headers || {};
      const b = parseInt(h["content-length"] || 0, 10);
      console.log(`[OK] Selesai: ${i}`);
      return {
        result: dl,
        id: i,
        ext: ext,
        type: h["content-type"] || `video/${ext}`,
        size: this.sz(b),
        bytes: b,
        meta: {
          server: h["server"] || "N/A",
          etag: h["etag"]?.replace(/"/g, "") || null,
          last_mod: h["last-modified"] || null,
          status: res?.status || 200
        },
        at: new Date().toISOString()
      };
    } catch (e) {
      console.error(`[ERR] ${e.message}`);
      return {
        result: null,
        ok: false,
        status: e?.response?.status || 500,
        msg: e?.message || "ERROR"
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
  const api = new Videy();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}