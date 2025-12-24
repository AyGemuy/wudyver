import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class JarakChecker {
  constructor() {
    this.baseHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8?url=`;
  }
  async hitungJarak(from, to) {
    try {
      const query = `jarak ${from} ke ${to}`;
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=id`;
      const {
        data
      } = await axios.get(`${this.baseHtml}${encodeURIComponent(url)}`);
      const $ = cheerio.load(data);
      const img = $('script:contains("var s=\'")').text().match(/var s='(.*?)'/)?.[1] || "";
      const imgData = /^data:.*?\/.*?;base64,/i.test(img) ? img.split(",")[1] : null;
      const waktuTempuh = $("div.RES9jf.IFnjPb time").text().trim();
      const jarakKm = $("div.RES9jf.IFnjPb span:nth-child(3)").text().trim();
      const viaJalan = $("div.GMmKXd.sjVJQd.q8U8x.RES9jf span").text().trim();
      const jalanTol = $("div.sjVJQd.q8U8x.ZYHQ7e span.Wm64ie:contains('Tol')").length > 0 ? "melewati jalan tol" : "tanpa jalan tol";
      const detail = waktuTempuh && jarakKm && viaJalan ? `Perjalanan dari ${from} ke ${to} menempuh jarak ${jarakKm}, dengan estimasi waktu ${waktuTempuh}, ${viaJalan} (${jalanTol}).` : null;
      const linkRute = $("div.ifJ6Pb a").attr("href") ? `https://www.google.com${$("div.ifJ6Pb a").attr("href")}` : null;
      return {
        detail: detail,
        rute: linkRute,
        img: imgData
      };
    } catch (error) {
      throw new Error("Terjadi kesalahan dalam menghitung jarak.");
    }
  }
}
export default async function handler(req, res) {
  const {
    from,
    to
  } = req.method === "GET" ? req.query : req.body;
  if (!from || !to) return res.status(400).json({
    error: "Paramenter 'from' dan 'to' diperlukan"
  });
  try {
    const jarakChecker = new JarakChecker();
    const hasil = await jarakChecker.hitungJarak(from, to);
    return res.status(200).json(hasil);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}