import axios from "axios";
import * as cheerio from "cheerio";
class KabupatenQuiz {
  constructor() {
    this.base_url = "https://id.wikipedia.org";
    this.list_url = `${this.base_url}/wiki/Daftar_kabupaten_di_Indonesia`;
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      referer: "https://www.google.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sanitize(text) {
    return text ? text.replace(/\[\d+\]/g, "").replace(/[\n\t]/g, " ").replace(/\s+/g, " ").trim() : "-";
  }
  _format_url(url) {
    if (!url) return null;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return `${this.base_url}${url}`;
    return url;
  }
  _hd_img(url) {
    const clean = this._format_url(url);
    if (!clean) return null;
    return clean.includes("/thumb/") ? clean.replace(/\/thumb\//, "/").replace(/\/\d+px-.*$/, "") : clean;
  }
  _clean_text($, el) {
    const clone = el.clone();
    clone.find("style, script, .mw-empty-elt, .penicon").remove();
    const items = clone.find("li");
    if (items.length > 0) {
      return items.map((_, li) => $(li).text().trim()).get().join(", ");
    }
    return clone.text().trim();
  }
  _generate_hint(name) {
    return name.split("").map((char, index) => {
      if (char === " ") return "  ";
      return index % 2 === 0 ? char : "_";
    }).join(" ");
  }
  _generate_soal(info) {
    const facts = [];
    if (info.provinsi !== "-") facts.push(`terletak di wilayah Provinsi ${info.provinsi}`);
    if (info.ibu_kota !== "-") facts.push(`ber-ibu kota di daerah ${info.ibu_kota}`);
    if (info.julukan !== "-") facts.push(`dikenal dengan sebutan "${info.julukan}"`);
    if (info.motto !== "-") facts.push(`memiliki motto "${info.motto}"`);
    if (info.pelat_nomor !== "-") facts.push(`memiliki kode pelat kendaraan "${info.pelat_nomor}"`);
    const desc = facts.length > 0 ? facts.join(", ") : "merupakan salah satu kabupaten di Indonesia";
    return `Kabupaten apakah yang dimaksud? Informasi: Daerah ini ${desc}.`;
  }
  async fetch_detail(path) {
    try {
      const target = this._format_url(path);
      const {
        data
      } = await axios.get(target, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const box = $("table.infobox");
      const images = [];
      box.find('.infobox-full-data span[typeof="mw:File"] img').each((_, el) => {
        const src = $(el).attr("src");
        if (src && !src.includes("mapframe") && !src.includes("location") && !src.includes("Red_pog")) {
          images.push(this._hd_img(src));
        }
      });
      const logo_src = box.find(".ib-settlement-cols img").first()?.attr("src");
      const find_row = label => {
        const row = box.find("tr").filter((_, el) => $(el).text().includes(label));
        const td = row.find("td").first();
        return this._sanitize(this._clean_text($, td));
      };
      return {
        all_portraits: images,
        logo_hd: this._hd_img(logo_src),
        nickname: this._sanitize(box.find(".ib-settlement-nickname i").first().text()),
        motto: this._sanitize(box.find(".ib-settlement-nickname").last().text()),
        leader: find_row("Bupati"),
        area: find_row("Total"),
        population: this._sanitize(this._clean_text($, box.find('tr.mergedrow:contains("Total") td').last())),
        religion: find_row("Agama"),
        timezone: find_row("Zona waktu"),
        plate: find_row("Pelat kendaraan"),
        postal: box.find(".postal-code").first()?.text()?.trim() || "-",
        web: box.find("a.external.free").attr("href") || "-",
        capital: find_row("Ibu kota")
      };
    } catch {
      return null;
    }
  }
  async generate() {
    try {
      const {
        data
      } = await axios.get(this.list_url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const list = [];
      $("#foo tbody tr").each((_, el) => {
        const td = $(el).find("td");
        const a = td.eq(1).find("a").first();
        if (a.attr("href") && !a.text().includes("Kota")) {
          list.push({
            name: a.text().trim(),
            path: a.attr("href"),
            prov: td.eq(3).text().trim()
          });
        }
      });
      if (!list.length) throw new Error("Gagal memuat daftar Wikipedia.");
      const selected = list[Math.floor(Math.random() * list.length)];
      const detail = await this.fetch_detail(selected.path);
      if (!detail) return await this.generate();
      const info_res = {
        nama: selected.name,
        provinsi: selected.prov,
        ibu_kota: detail.capital,
        julukan: detail.nickname,
        motto: detail.motto,
        pemimpin: detail.leader,
        populasi: detail.population,
        luas: detail.area,
        agama: detail.religion,
        zona_waktu: detail.timezone,
        pelat_nomor: detail.plate,
        kode_pos: detail.postal,
        situs_web: detail.web
      };
      return {
        status: 200,
        creator: "Wikipedia-Kabupaten-Scraper",
        question: this._generate_soal(info_res),
        answer: selected.name,
        logo: detail.logo_hd,
        portrait_images: detail.all_portraits,
        hint: {
          underline: this._generate_hint(selected.name),
          message: `Kabupaten ini berada di ${selected.prov} dan dipimpin oleh Bupati ${detail.leader}.`
        },
        details: info_res
      };
    } catch (error) {
      return {
        status: 500,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new KabupatenQuiz();
  try {
    const data = await api.generate();
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}