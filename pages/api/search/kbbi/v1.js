import axios from "axios";
import * as cheerio from "cheerio";
class KbbiClean {
  constructor() {
    this.base = "https://kbbi.web.id";
    this.heads = {
      Accept: "*/*",
      "Accept-Language": "id-ID",
      Referer: this.base,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest"
    };
  }
  clean(str) {
    if (!str) return "";
    return str.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/&#183;/g, "").replace(/&nbsp;/g, " ").replace(/[^\w\s\-,.;:()?!'"\/]/g, "").replace(/\s+/g, " ").trim();
  }
  async req(path) {
    const url = `${this.base}/${path}`;
    console.log(`[LOG] Mengambil data: ${url}`);
    return await axios.get(url, {
      headers: this.heads,
      validateStatus: () => true
    });
  }
  proc(htmlRaw, rootWord) {
    if (!htmlRaw) return null;
    const $ = cheerio.load(htmlRaw, null, false);
    const nodes = $.root().contents();
    let currentEjaan = rootWord;
    let definitions = [];
    let buffer = {
      jenis: "induk",
      sub_lema: null,
      kelas_kata: [],
      teks_parts: []
    };
    const flush = () => {
      const rawDesc = buffer.teks_parts.join(" ");
      const cleanDesc = this.clean(rawDesc);
      const cleanSub = buffer.sub_lema ? this.clean(buffer.sub_lema) : null;
      if (cleanDesc && cleanDesc.length > 1) {
        definitions.push({
          jenis: buffer.jenis,
          sub_lema: cleanSub,
          kelas_kata: buffer.kelas_kata.join(", ") || "umum",
          deskripsi: cleanDesc
        });
      }
      buffer.teks_parts = [];
      buffer.kelas_kata = [];
    };
    nodes.each((i, el) => {
      const $el = $(el);
      const tagName = el.tagName;
      const type = el.type;
      if (tagName === "br") {
        flush();
        return;
      }
      if (tagName === "b") {
        const txt = $el.text();
        if (i === 0) {
          currentEjaan = this.clean(txt);
          return;
        }
        if (txt.includes("--")) {
          flush();
          buffer.jenis = "turunan";
          buffer.sub_lema = txt.replace(/--/g, "");
          return;
        }
        if (/^\d+$/.test(txt.trim())) {
          flush();
          return;
        }
        buffer.teks_parts.push(txt);
        return;
      }
      if (tagName === "em") {
        const k = $el.text().trim();
        if (buffer.teks_parts.length === 0) {
          buffer.kelas_kata.push(k);
        } else {
          buffer.teks_parts.push(k);
        }
        return;
      }
      const content = $el.text();
      if (content && content.trim()) {
        buffer.teks_parts.push(content);
      }
    });
    flush();
    return {
      ejaan: currentEjaan,
      daftar_arti: definitions
    };
  }
  async search({
    query,
    ...rest
  }) {
    const q = query?.trim();
    const safeQ = encodeURIComponent(q || "");
    console.log(`[LOG] Memproses kata kunci: "${q || "-"}"`);
    try {
      if (!q) throw new Error("Query kosong.");
      const res = await this.req(`${safeQ}/ajax_submit`);
      const rawData = res?.data;
      if (!Array.isArray(rawData)) {
        return {
          status: false,
          pesan: "Tidak ditemukan",
          data: []
        };
      }
      const results = rawData.map(item => {
        const parsed = this.proc(item.d, item.w);
        return {
          lema: item.w,
          info_tambahan: this.clean(item.msg || ""),
          ejaan_tampil: parsed?.ejaan || item.w,
          arti: parsed?.daftar_arti || []
        };
      });
      return {
        status: true,
        total: results.length,
        data: results
      };
    } catch (err) {
      console.error(`[ERROR] ${err?.message}`);
      return {
        status: false,
        pesan: err?.message || "Internal Server Error",
        data: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new KbbiClean();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}