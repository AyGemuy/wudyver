import axios from "axios";
import * as cheerio from "cheerio";
async function Calendar(year = new Date().getFullYear()) {
  const url = `https://publicholidays.co.id/id/${year}-dates/`;
  try {
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const holidays = [];
    $("table.publicholidays.phgtable tbody tr").each((_, el) => {
      const date = $(el).find("td:nth-child(1)").text().trim();
      if (/^\d/.test(date)) {
        holidays.push({
          date: date,
          day: $(el).find("td:nth-child(2)").text().trim() || "Tidak Diketahui",
          holiday: $(el).find("td:nth-child(3)").text().trim() || $(el).find("td:nth-child(3) a").text().trim() || "Tidak Diketahui",
          link: $(el).find("td:nth-child(3) a").attr("href") || "Tidak Tersedia"
        });
      }
    });
    return holidays;
  } catch (error) {
    console.error("Error scraping holidays:", error.message);
    throw new Error("Gagal mengambil data hari libur. Silakan coba lagi.");
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