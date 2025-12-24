import axios from "axios";
import * as cheerio from "cheerio";
class KbbiBizlab {
  constructor() {
    this.base = "https://bizlab.co.id";
    this.heads = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID",
      Referer: "https://bizlab.co.id/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Priority: "u=0, i"
    };
  }
  clean(str) {
    if (!str) return "";
    return str.replace(/<[^>]*>/g, "").replace(/&[#\w]+;/g, "").replace(/\s+/g, " ").trim();
  }
  async req(query) {
    const url = `${this.base}/${encodeURIComponent(query)}`;
    console.log(`[LOG] Mengakses URL: ${url}`);
    return await axios.get(url, {
      headers: this.heads,
      validateStatus: status => status < 500
    });
  }
  proc(htmlRaw, defaultLema) {
    if (!htmlRaw) return null;
    const $ = cheerio.load(htmlRaw, null, false);
    const $d1 = $("#d1");
    if ($d1.length === 0) return null;
    let ejaan = defaultLema;
    const $firstB = $d1.find("b").first();
    if ($firstB.length > 0 && !$firstB.text().match(/^\d+$/)) {
      ejaan = $firstB.text().replace(/&#183;/g, ".");
      $firstB.remove();
    }
    $d1.find("#info").remove();
    const nodes = $d1.contents();
    let defs = [];
    let buffer = {
      nomor: null,
      kelas: [],
      teks: [],
      contoh: []
    };
    const flush = () => {
      const desc = this.clean(buffer.teks.join(" "));
      if (desc) {
        defs.push({
          nomor: buffer.nomor,
          kelas_kata: buffer.kelas.join(", ") || "umum",
          deskripsi: desc,
          contoh: buffer.contoh.join("; ") || null
        });
      }
      buffer.teks = [];
      buffer.contoh = [];
    };
    nodes.each((i, el) => {
      const $el = $(el);
      const tag = el.tagName;
      const txt = $el.text();
      if (tag === "b") {
        if (/^\d+$/.test(txt.trim())) {
          flush();
          buffer.nomor = txt.trim();
          buffer.kelas = [];
        } else {
          buffer.teks.push(txt);
        }
      } else if (tag === "em") {
        const cleanEm = this.clean(txt);
        const isKelasKata = cleanEm.length <= 5 && /^[a-z]+$/.test(cleanEm);
        if (isKelasKata) {
          if (buffer.teks.length > 0) flush();
          buffer.kelas.push(cleanEm);
        } else {
          buffer.contoh.push(cleanEm);
        }
      } else if (el.type === "text") {
        const t = this.clean(txt);
        if (t && t !== ";") {
          buffer.teks.push(t);
        }
      }
    });
    flush();
    return {
      lema: defaultLema,
      ejaan_suku_kata: ejaan,
      arti: defs
    };
  }
  async search({
    query,
    ...rest
  }) {
    const q = query?.trim();
    console.log(`[LOG] Mencari di Bizlab: "${q || "-"}"`);
    try {
      if (!q) throw new Error("Query kosong");
      const res = await this.req(q);
      const html = res?.data;
      if (!html) {
        return {
          status: false,
          pesan: "Tidak ada respons",
          data: null
        };
      }
      const $ = cheerio.load(html);
      const title = $("h2").first().text();
      if (!title.includes("Definisi untuk")) {
        return {
          status: false,
          pesan: "Kata tidak ditemukan",
          data: null
        };
      }
      const contentHtml = $.html();
      const parsed = this.proc(contentHtml, q);
      return {
        status: true,
        sumber: "Bizlab.co.id",
        data: parsed
      };
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return {
          status: false,
          pesan: "Kata tidak ditemukan (404)",
          data: null
        };
      }
      console.error(`[ERROR] ${err?.message}`);
      return {
        status: false,
        pesan: err?.message || "Server Error",
        data: null
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
  const api = new KbbiBizlab();
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