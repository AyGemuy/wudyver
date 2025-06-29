import axios from "axios";
import * as cheerio from "cheerio";
class JadwalSholat {
  constructor() {
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=0, i",
      referer: "https://jadwalsholat.org/jadwal-sholat/monthly.php?id=235",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "iframe",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getCitySelectOption() {
    try {
      const response = await axios.get("https://jadwalsholat.org/jadwal-sholat/monthly.php", {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      return $(".inputcity > option").map(function() {
        const kota = $(this).text().trim().toLowerCase().split(",")[0];
        const id = $(this).attr("value").trim();
        return {
          kota: kota,
          id: id
        };
      }).get().sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
      console.error("Error fetching city options:", error);
      throw new Error("Error fetching city options");
    }
  }
  async fetchMonthlyData(id) {
    try {
      const response = await axios.get(`https://jadwalsholat.org/jadwal-sholat/monthly.php?id=${id}`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const headers = $("tr.table_header > td").map(function() {
        return $(this).text().trim().toLowerCase();
      }).get();
      const jadwal = $("tr.table_light, tr.table_dark").map(function() {
        const data = {};
        $(this).children("td").each(function(index) {
          data[headers[index]] = $(this).text().trim().toLowerCase();
        });
        return data;
      }).get();
      return jadwal;
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      throw new Error("Error fetching monthly data");
    }
  }
}
export default async function handler(req, res) {
  const {
    id
  } = req.method === "GET" ? req.query : req.body;
  const jadwalSholat = new JadwalSholat();
  try {
    const cityOptions = await jadwalSholat.getCitySelectOption();
    if (!id) {
      return res.status(400).json({
        message: "ID is required",
        cityOptions: cityOptions
      });
    } else {
      const isValidId = cityOptions.some(option => option.id === id);
      if (!isValidId) {
        return res.status(400).json({
          message: "Invalid ID provided",
          cityOptions: cityOptions
        });
      }
      const monthlyData = await jadwalSholat.fetchMonthlyData(id);
      return res.status(200).json(monthlyData);
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}