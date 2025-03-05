import axios from "axios";
import * as cheerio from "cheerio";
class CekArtiNama {
  constructor() {
    this.client = axios.create({
      baseURL: "https://cekartinama.com",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "max-age=0",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://cekartinama.com",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async cariArtiNama(nama = "udin") {
    try {
      const url = `/cari-arti-nama/${encodeURIComponent(nama)}.html`;
      const referer = `https://cekartinama.com/cari-arti-nama/${encodeURIComponent(nama)}.html`;
      const response = await this.client.get(url, {
        headers: {
          Referer: referer
        }
      });
      const $ = cheerio.load(response.data);
      const extractedName = $("h1").text().replace("Arti Nama Bayi ", "").replace("Menu", "").trim();
      const meaning = $("article").text().trim();
      return {
        success: true,
        result: {
          status: true,
          message: {
            nama: {
              nama: extractedName
            },
            arti: meaning,
            catatan: "Gunakan juga aplikasi numerologi Kecocokan Nama, untuk melihat sejauh mana keselarasan nama anda dengan diri anda."
          }
        }
      };
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    nama
  } = req.method === "GET" ? req.query : req.body;
  if (!nama) return res.status(400).json({
    error: "nama is required"
  });
  const ArtiNama = new CekArtiNama();
  try {
    const data = await ArtiNama.cariArtiNama(nama);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}