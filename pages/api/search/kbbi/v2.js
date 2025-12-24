import axios from "axios";
import * as cheerio from "cheerio";
class KbbiKemdikbud {
  constructor() {
    this.base = "https://kbbi.kemdikbud.go.id";
    this.heads = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID",
      Priority: "u=0, i",
      Referer: "https://kbbi.kemdikbud.go.id/",
      "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  clean(str) {
    return str ? str.replace(/\s+/g, " ").trim() : "";
  }
  async req(path) {
    const url = `${this.base}/${path}`;
    console.log(`[LOG] Mengakses URL: ${url}`);
    return await axios.get(url, {
      headers: this.heads,
      maxRedirects: 5,
      validateStatus: s => s < 500
    });
  }
  proc(htmlRaw) {
    if (!htmlRaw) return null;
    const $ = cheerio.load(htmlRaw);
    const h2Raw = $("h2").first().text().trim();
    if (!h2Raw || h2Raw.includes("Entri tidak ditemukan")) return null;
    const lemaBersih = h2Raw.replace(/\./g, "");
    const definitions = [];
    $("ol li, ul li").each((i, el) => {
      const $el = $(el);
      const listKelas = $el.find('font[color="red"]').map((_, f) => {
        return $(f).find("span").text().trim() || $(f).text().trim();
      }).get();
      const contohRaw = $el.find('font[color="grey"]').text();
      const contohClean = this.clean(contohRaw);
      const $clone = $el.clone();
      $clone.find('font[color="red"]').remove();
      $clone.find('font[color="grey"]').remove();
      let artiClean = this.clean($clone.text());
      artiClean = artiClean.replace(/^[:;]\s*/, "");
      definitions.push({
        kelas_kata: listKelas.join(", ") || "umum",
        deskripsi: artiClean,
        contoh: contohClean || null
      });
    });
    return {
      lema: lemaBersih,
      ejaan_suku_kata: h2Raw,
      arti: definitions
    };
  }
  async search({
    query,
    ...rest
  }) {
    const q = query?.trim();
    const safeQ = encodeURIComponent(q || "");
    console.log(`[LOG] Memulai pencarian di Kemdikbud: "${q}"`);
    try {
      if (!q) throw new Error("Query kosong");
      const res = await this.req(`entri/${safeQ}`);
      const html = res?.data;
      if (!html || !html.includes("KBBI VI Daring")) {
        throw new Error("Halaman tidak valid atau diblokir.");
      }
      const result = this.proc(html);
      if (!result) {
        console.log("[LOG] Kata tidak ditemukan dalam database.");
        return {
          status: false,
          pesan: "Entri tidak ditemukan",
          data: null
        };
      }
      return {
        status: true,
        sumber: "KBBI VI Daring (Kemdikbud)",
        data: result
      };
    } catch (err) {
      console.error(`[ERROR] Terjadi kesalahan: ${err?.message}`);
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
  const api = new KbbiKemdikbud();
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