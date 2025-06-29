import axios from "axios";
import * as cheerio from "cheerio";
async function Calendar() {
  try {
    const {
      data: html
    } = await axios.get("https://www.liburnasional.com/");
    const $ = cheerio.load(html);
    const nextLibur = $("div.row.row-alert > div").text().split("Hari libur")[1]?.trim() || "Tidak Diketahui";
    const libnas_content = $("tbody > tr").map((_, row) => {
      const summary = $(row).find("span > strong > a").text().trim() || "Tidak Diketahui";
      const days = $(row).find("div.libnas-calendar-holiday-weekday").text().trim() || "Tidak Diketahui";
      const dateMonth = $(row).find("time.libnas-calendar-holiday-datemonth").text().trim() || "Tidak Diketahui";
      return {
        summary: summary,
        days: days,
        dateMonth: dateMonth
      };
    }).get();
    return {
      nextLibur: nextLibur,
      libnas_content: libnas_content
    };
  } catch (err) {
    console.error("Error fetching calendar:", err.message);
    return {
      nextLibur: "Tidak Diketahui",
      libnas_content: []
    };
  }
}
export default async function handler(req, res) {
  try {
    const holidays = await Calendar();
    return res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({
      message: "Gagal memuat data hari libur"
    });
  }
}