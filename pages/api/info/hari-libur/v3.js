import axios from "axios";
import * as cheerio from "cheerio";
async function Calendar() {
  try {
    const url = "https://onlinealarmkur.com/calendar/id/";
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const holidays = [];
    $("table.table tbody tr").each((i, el) => {
      const holiday = {
        index: $(el).find("td").eq(0).text().trim(),
        tanggal: $(el).find("td").eq(2).text().trim(),
        hari: $(el).find("td").eq(3).text().trim(),
        keterangan: $(el).find("td").eq(1).text().trim()
      };
      holidays.push(holiday);
    });
    return holidays;
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    throw new Error("Failed to fetch calendar data");
  }
}
export default async function handler(req, res) {
  try {
    const holidays = await Calendar();
    return res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}