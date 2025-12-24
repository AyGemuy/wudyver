import fetch from "node-fetch";
import * as cheerio from "cheerio";
class Umrotix {
  constructor() {
    this.listSurah = null;
  }
  async fetchHtml(url) {
    const response = await fetch(url);
    return await response.text();
  }
  async alquranList() {
    const html = await this.fetchHtml("https://umrotix.com/alquran-online");
    const $ = cheerio.load(html);
    return $("ul.list-quran li").map((_, el) => ({
      nama: $(el).find("div.css-u41jef").text().trim(),
      link: $(el).find("a").attr("href")
    })).get();
  }
  async alquran(surat, ayat = null) {
    if (!this.listSurah) this.listSurah = await this.alquranList();
    const selected = this.listSurah.find(el => el.link.split("/").pop().split("-").pop() === surat.toString())?.link;
    if (!selected) throw new Error(`Surat ${surat} tidak ditemukan.`);
    const html = await this.fetchHtml(selected);
    const $ = cheerio.load(html);
    const ayatList = $(".quran-uthmani .css-90cpcj").map((_, el) => {
      const teks = $(el).find("p.style-ayah").text().trim().replace(/\d+$/, "").trim();
      const terjemahan = $(el).find("p.translate-text").text().trim().substring(2);
      return {
        teks: teks,
        terjemahan: terjemahan
      };
    }).get().filter((_, idx) => idx > 0);
    return ayat ? ayatList[ayat - 1] : ayatList;
  }
  async jadwalSholat(q) {
    const html = await this.fetchHtml(`https://umrotix.com/jadwal-sholat/${q}`);
    const $ = cheerio.load(html);
    return $("div.times-prays div.main-input.block").map((_, el) => ({
      nama: $(el).find("p:nth-child(1)").text().trim(),
      waktu: $(el).find("p:nth-child(2)").text().trim()
    })).get();
  }
}
export default async function handler(req, res) {
  const umrotix = new Umrotix();
  try {
    const {
      type,
      surah,
      ayat,
      q
    } = req.method === "GET" ? req.query : req.body;
    if (type === "alquran") {
      if (!surah) {
        return res.status(400).json({
          error: "Paramenter 'surah' wajib ada."
        });
      }
      const data = await umrotix.alquran(surah, ayat ? parseInt(ayat) : null);
      return res.status(200).json(data);
    }
    if (type === "sholat" && q) {
      const jadwal = await umrotix.jadwalSholat(q);
      return res.status(200).json(jadwal);
    }
    return res.status(400).json({
      error: "Tipe request tidak valid."
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}