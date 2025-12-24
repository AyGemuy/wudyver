import axios from "axios";
import * as cheerio from "cheerio";
async function Calendar(year = new Date().getFullYear()) {
  try {
    const url = `https://www.tanggalan.com/${year}`;
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const hasil = [];
    $("#main ul").each((_, ul) => {
      const bulan = $(ul).find("li:nth-child(1) a").text().trim().slice(0, -4).toUpperCase();
      const hariLibur = $(ul).find("table tr").map((_, tr) => ({
        tanggal: $(tr).find("td:nth-child(1)").text().trim(),
        keterangan: $(tr).find("td:nth-child(2)").text().trim()
      })).get();
      if (bulan && hariLibur.length) hasil.push({
        bulan: bulan,
        hariLibur: hariLibur
      });
    });
    return hasil;
  } catch (error) {
    console.error("Error:", error.message);
    return [];
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