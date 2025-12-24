import axios from "axios";
import * as cheerio from "cheerio";
async function Calendar(year = new Date().getFullYear()) {
  const url = `https://www.qppstudio.net/publicholidays${year}/indonesia.htm`;
  try {
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const liburan = [];
    $("table tbody tr").each((_, el) => {
      const namaLiburanId = $(el).find("td span.detail-black").text().trim().split("\n")[0].slice(1, -1);
      const namaLiburanEn = $(el).find("td").eq(2).text().trim().split("\n")[0];
      liburan.push({
        tanggal: $(el).find("td time").text().trim(),
        hari: $(el).find(".weekday").text().trim(),
        namaLiburan: namaLiburanId || namaLiburanEn,
        pengamatan: $(el).find(".observance").text().trim()
      });
    });
    return {
      negara: $(".country-header h1").text().trim(),
      liburan: liburan
    };
  } catch (err) {
    console.error(err);
    return {
      negara: "Tidak Dikenal",
      liburan: []
    };
  }
}
export default async function handler(req, res) {
  const {
    year
  } = req.method === "GET" ? req.query : req.body;
  if (year && isNaN(year)) {
    return res.status(400).json({
      message: "Paramenter tahun tidak valid."
    });
  }
  try {
    const holidays = await Calendar(year || undefined);
    return res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
}