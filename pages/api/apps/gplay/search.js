import axios from "axios";
import * as cheerio from "cheerio";
class GPlayScraper {
  constructor() {
    this.head = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    };
    this.host = "https://play.google.com";
  }
  async req(url) {
    console.log(`[LOG] Memulai request ke: ${url}`);
    try {
      const res = await axios.get(url, {
        headers: this.head
      });
      console.log(`[LOG] Status request: ${res.status}`);
      return res.data;
    } catch (e) {
      console.error(`[ERROR] Gagal request: ${e.message}`);
      return null;
    }
  }
  async search({
    query,
    ...rest
  }) {
    const lang = rest.hl || "id";
    const country = rest.gl || "ID";
    const term = encodeURIComponent(query);
    const target = `${this.host}/store/search?q=${term}&c=apps&hl=${lang}&gl=${country}`;
    console.log(`[LOG] Memproses pencarian: "${query}"`);
    try {
      const html = await this.req(target);
      if (!html) throw new Error("HTML kosong atau request gagal");
      const $ = cheerio.load(html);
      const data = [];
      console.log(`[LOG] Parsing elemen HTML...`);
      $(".ULeU3b").each((i, el) => {
        const node = $(el);
        const title = node.find(".DdYX5").text()?.trim() || "Tanpa Judul";
        const dev = node.find(".wMUdtb").text()?.trim() || "Unknown Dev";
        const rateText = node.find(".w2kbF").text();
        const rate = rateText ? rateText.trim() : "0.0";
        const linkRaw = node.find("a.Si6A0c").attr("href");
        const link = linkRaw ? `${this.host}${linkRaw}` : null;
        const id = linkRaw?.split("id=")[1]?.split("&")[0] || null;
        const icon = node.find("img.stzEZd").attr("data-src") || node.find("img.stzEZd").attr("src") || "";
        const cover = node.find("img.T75of").attr("data-src") || node.find("img.T75of").attr("src") || "";
        if (link && title) {
          data.push({
            title: title,
            id: id,
            dev: dev,
            rate: rate,
            link: link,
            img: {
              icon: icon,
              cover: cover
            }
          });
        }
      });
      console.log(`[LOG] Selesai. Ditemukan ${data.length} hasil.`);
      return {
        result: data
      };
    } catch (error) {
      console.error(`[ERROR] Terjadi kesalahan saat search: ${error.message}`);
      return [];
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
  const api = new GPlayScraper();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}