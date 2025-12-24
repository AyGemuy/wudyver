import axios from "axios";
import * as cheerio from "cheerio";
class CrxTool {
  constructor() {
    this.ep = "https://www.crx4chrome.com/crx-url.php";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
    this.rCws = /https?:\/\/(?:chrome|chromewebstore)\.google\.com\/.*\/([a-z]{32})(?=[\/#?]|$)/;
    this.rEdge = /https?:\/\/microsoftedge\.microsoft\.com\/addons\/detail\/.*\/([a-z]{32})(?=[\/#?]|$)/;
    this.rId = /^[a-z]{32}$/;
  }
  log(m, tag = "INFO") {
    console.log(`[${tag}] ${m}`);
  }
  clean(s) {
    return (s || "extension").replace(/[^\w\s\.-]/g, "").trim().replace(/\s+/g, "-");
  }
  find(v) {
    try {
      const id = v?.match(this.rEdge)?.[1] || v?.match(this.rCws)?.[1] || (this.rId.test(v) ? v : null);
      if (!id) throw new Error("ID/URL Pattern mismatch");
      const src = this.rEdge.test(v) ? "edge" : "google";
      return {
        id: id,
        src: src
      };
    } catch (e) {
      return null;
    }
  }
  async req(id) {
    this.log(`Mengirim request ke server untuk ID: ${id}...`, "REQ");
    const data = new URLSearchParams();
    data.append("id", id);
    const res = await axios.post(this.ep, data, {
      headers: {
        "User-Agent": this.ua,
        Referer: "https://www.crx4chrome.com/crx-downloader/",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    return res?.data || null;
  }
  par(html) {
    this.log("Memproses respon HTML...", "PARSE");
    const $ = cheerio.load(html || "");
    const isSuccess = $(".app-title")?.text()?.includes("successfully") ?? false;
    if (!isSuccess) return null;
    const dlLink = $('a.download-button[href*=".crx"]')?.attr("href");
    const infoTxt = $(".info")?.text() || "";
    const extId = infoTxt.match(/ID:\s*([a-z]{32})/i)?.[1];
    const ver = infoTxt.match(/Version:\s*([0-9\.]+)/)?.[1];
    return {
      ok: true,
      id: extId || "Unknown",
      version: ver || "Unknown",
      download: dlLink || null,
      filename: `${this.clean(extId)}_${ver || "0"}.crx`
    };
  }
  async download({
    url,
    ...rest
  }) {
    const start = Date.now();
    this.log("Proses download dimulai...", "START");
    try {
      const parsed = this.find(url);
      this.log(`Input: ${url}`, "DEBUG");
      if (!parsed?.id) {
        throw new Error("Format URL tidak dikenali atau ID tidak ditemukan");
      }
      this.log(`Deteksi: ID=${parsed.id} | Source=${parsed.src}`, "DEBUG");
      const html = await this.req(parsed.id);
      if (!html) throw new Error("Gagal terhubung ke server");
      const result = this.par(html);
      const final = result ? {
        ...result,
        source: parsed.src,
        ...rest
      } : {
        ok: false,
        msg: "Link download tidak tersedia di database Crx4Chrome"
      };
      this.log(`Selesai dalam ${Date.now() - start}ms`, "DONE");
      return final;
    } catch (err) {
      this.log(`Error: ${err?.message}`, "ERROR");
      return {
        ok: false,
        msg: err?.message || "Internal Error",
        originalInput: url
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
  const api = new CrxTool();
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