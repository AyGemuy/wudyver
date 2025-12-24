import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class JarakChecker {
  constructor() {
    this.apiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8`;
  }
  async hitungJarak({
    from,
    to,
    more = []
  }) {
    const kota = [from, to, ...more].filter(Boolean);
    if (kota.length < 2) throw new Error("Minimal dua kota diperlukan.");
    try {
      const {
        data
      } = await axios.get(`${this.apiUrl}?url=https://www.distance.to/${kota.join("/")}`, {
        timeout: 12e4
      });
      return this.parseData(data);
    } catch (err) {
      return `Gagal mengambil data: ${err.message}`;
    }
  }
  parseData(data) {
    const $ = cheerio.load(data);
    return {
      route: $(".main-route.trip").text().trim().replace(/\s+/g, " "),
      airline: {
        mi: $(".headerAirline .value.mi").eq(0).text().trim(),
        km: $(".headerAirline .value.km").eq(0).text().trim()
      },
      driving: {
        mi: $(".headerRoute .directionsResultTotal .value").eq(0).text().trim(),
        km: $(".headerRoute .directionsResultTotal .e2nd .value").eq(0).text().trim()
      },
      extended: $(".extended-information.information-block .extended-step").map((_, el) => ({
        step: $(el).find(".step").text().match(/#(\d+)/)?.[1] || "N/A",
        pointName: $(el).find(".point a").text() || "Unknown",
        regionsInt: $(el).find(".regionsInt.prop").text() || "N/A",
        regions: $(el).find(".regions.prop").text() || "N/A",
        latitude: $(el).find(".coords.lat.prop").text().replace("Latitude: ", "") || "N/A",
        longitude: $(el).find(".coords.lng.prop").text().replace("Longitude: ", "") || "N/A",
        timezone: $(el).find(".timezone.prop").text() || "N/A"
      })).get()
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.from || !params.to) return res.status(400).json({
    error: "Paramenter 'from' dan 'to' diperlukan"
  });
  try {
    const jarakChecker = new JarakChecker();
    const hasil = await jarakChecker.hitungJarak(params);
    return res.status(200).json(hasil);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}