import axios from "axios";
import * as cheerio from "cheerio";
class KbbiCoId {
  constructor() {
    this.base = "https://kbbi.co.id/cari";
    this.heads = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID",
      Referer: "https://kbbi.co.id/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Priority: "u=0, i"
    };
  }
  clean(str) {
    if (!str) return "";
    return str.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&middot;/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }
  async req(query) {
    const url = `${this.base}?kata=${encodeURIComponent(query)}`;
    console.log(`[LOG] Mengakses: ${url}`);
    return await axios.get(url, {
      headers: this.heads,
      validateStatus: () => true
    });
  }
  parseContent(htmlString) {
    if (!htmlString) return [];
    const $ = cheerio.load(htmlString, null, false);
    const nodes = $.root().contents();
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
      if (tag === "body") {
        const innerResult = this.parseContent($el.html());
        defs = defs.concat(innerResult);
        return false;
      }
      if (tag === "b") {
        if (/^\d+$/.test(txt.trim())) {
          flush();
          buffer.nomor = txt.trim();
          buffer.kelas = [];
          return;
        }
        if (txt.includes("·") || txt.includes("--")) {
          return;
        }
        buffer.teks.push(txt);
      } else if (tag === "i") {
        const cleanI = txt.trim().replace(/[.;,]+$/, "");
        if (cleanI.length <= 5 && /^[a-z]+$/.test(cleanI)) {
          buffer.kelas.push(cleanI);
        } else {
          buffer.contoh.push(this.clean(txt));
        }
      } else if (el.type === "text") {
        const t = txt.trim();
        if (t.startsWith("/") && t.endsWith("/")) return;
        if (!t) return;
        buffer.teks.push(t);
      } else if (tag === "br") {}
    });
    flush();
    return defs;
  }
  proc(htmlRaw) {
    if (!htmlRaw) return null;
    const $ = cheerio.load(htmlRaw);
    const results = [];
    $(".col-sm-9 h2").each((i, el) => {
      const $h2 = $(el);
      const title = this.clean($h2.text());
      const $p = $h2.next("p");
      if ($p.length > 0) {
        const rawDefHtml = $p.html();
        const parsedDefs = this.parseContent(rawDefHtml);
        results.push({
          lema: title,
          arti: parsedDefs
        });
      }
    });
    return results;
  }
  async search({
    query,
    ...rest
  }) {
    const q = query?.trim();
    console.log(`[LOG] Mencari kata: "${q || "-"}"`);
    try {
      if (!q) throw new Error("Query wajib diisi");
      const res = await this.req(q);
      const html = res?.data;
      if (!html || !html.includes("KBBI.co.id")) {
        return {
          status: false,
          pesan: "Halaman tidak valid",
          data: []
        };
      }
      const parsedData = this.proc(html);
      if (parsedData.length === 0) {
        return {
          status: false,
          pesan: "Kata tidak ditemukan",
          data: []
        };
      }
      return {
        status: true,
        total: parsedData.length,
        sumber: "KBBI.co.id",
        data: parsedData
      };
    } catch (err) {
      console.error(`[ERROR] ${err?.message}`);
      return {
        status: false,
        pesan: err?.message || "Internal Error",
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
  const api = new KbbiCoId();
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