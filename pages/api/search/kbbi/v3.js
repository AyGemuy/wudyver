import axios from "axios";
import * as cheerio from "cheerio";
class KbbiTypoOnline {
  constructor() {
    this.base = "https://typoonline.com/api-kbbi";
    this.heads = {
      Accept: "*/*",
      "Accept-Language": "id-ID",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: "k55b1n5f8=3cc04a69aa8c6dcfebded60de0a50aff;",
      Origin: "https://typoonline.com",
      Priority: "u=1, i",
      Referer: "https://typoonline.com/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest"
    };
  }
  clean(str) {
    if (!str) return "";
    return str.replace(/<[^>]*>/g, "").replace(/•/g, "").replace(/\s+/g, " ").trim();
  }
  async req(query) {
    const url = `${this.base}/${encodeURIComponent(query)}`;
    console.log(`[LOG] POST Request ke: ${url}`);
    const params = new URLSearchParams();
    params.append("checktext", "1");
    params.append("ntxt", query);
    params.append("a3g4d21h4k", "3cc04a69aa8c6dcfebded60de0a50aff");
    return await axios.post(url, params, {
      headers: this.heads,
      validateStatus: () => true
    });
  }
  proc(htmlRaw, defaultWord) {
    if (!htmlRaw) return null;
    const $ = cheerio.load(htmlRaw, null, false);
    const rootNodes = $.root().contents();
    const lema = $(".key").text().trim() || defaultWord;
    const fullText = $.root().text();
    const matchEjaan = fullText.match(/\/([^\/]+)\//);
    const ejaan = matchEjaan ? matchEjaan[1] : lema;
    let definitions = [];
    let buffer = {
      type: "umum",
      text: []
    };
    let stopParsingDef = false;
    rootNodes.each((i, el) => {
      if (stopParsingDef) return;
      const $el = $(el);
      const tagName = el.tagName;
      if ($el.hasClass("ads-slot") || tagName === "h3" || $el.hasClass("reff-source")) {
        stopParsingDef = true;
        return;
      }
      if ($el.hasClass("head-kata") || $el.find(".head-kata").length > 0) return;
      if (tagName === "b" && /^\d+$/.test($el.text().trim())) {
        if (buffer.text.length > 0) {
          definitions.push({
            jenis: buffer.type,
            deskripsi: this.clean(buffer.text.join(" "))
          });
        }
        buffer = {
          type: "induk",
          text: []
        };
        return;
      }
      const textContent = $el.text();
      if (textContent.includes("•")) {
        if (buffer.text.length > 0) {
          definitions.push({
            jenis: buffer.type,
            deskripsi: this.clean(buffer.text.join(" "))
          });
        }
        buffer = {
          type: "turunan",
          text: [textContent.replace("•", "")]
        };
        return;
      }
      if (tagName === "br") {
        buffer.text.push(" ");
        return;
      }
      if (!$el.hasClass("key") && textContent.trim()) {
        if (!textContent.trim().startsWith("/")) {
          buffer.text.push(textContent);
        }
      }
    });
    if (buffer.text.length > 0) {
      const cleanText = this.clean(buffer.text.join(" "));
      if (cleanText && cleanText !== lema && !cleanText.startsWith("/")) {
        definitions.push({
          jenis: buffer.type,
          deskripsi: cleanText
        });
      }
    }
    const contohKalimat = [];
    $(".reff-sentence").each((_, el) => {
      const raw = $(el).html();
      const cleanSent = this.clean(raw.replace(/<br>/g, " "));
      if (cleanSent) contohKalimat.push(cleanSent);
    });
    const kataTerkait = [];
    $(".other_word").each((_, el) => {
      const word = $(el).text().trim();
      if (word) kataTerkait.push(word);
    });
    return {
      lema: lema,
      ejaan_suku_kata: ejaan,
      definisi: definitions,
      contoh_penggunaan: contohKalimat,
      kata_terkait: kataTerkait
    };
  }
  async search({
    query,
    ...rest
  }) {
    const q = query?.trim();
    console.log(`[LOG] Mencari di TypoOnline: "${q}"`);
    try {
      if (!q) throw new Error("Query kosong");
      const res = await this.req(q);
      const html = res?.data;
      if (!html || html.length < 50) {
        return {
          status: false,
          pesan: "Tidak ada respon valid",
          data: null
        };
      }
      const parsed = this.proc(html, q);
      return {
        status: true,
        sumber: "TypoOnline (API KBBI)",
        data: parsed
      };
    } catch (err) {
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
  const api = new KbbiTypoOnline();
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