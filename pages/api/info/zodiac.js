import axios from "axios";
import * as cheerio from "cheerio";
const validZodiacs = ["capricorn", "aquarius", "pisces", "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius"];
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    zodiac
  } = method === "GET" ? req.query : req.body;
  const invalidResponse = !zodiac || !validZodiacs.includes(zodiac.toLowerCase()) ? res.status(400).json({
    error: "Zodiak tidak valid. Pilih dari daftar berikut:",
    validZodiacs: validZodiacs
  }) : null;
  if (invalidResponse) return invalidResponse;
  try {
    const {
      data
    } = await axios.get(`https://www.fimela.com/zodiak/${zodiac}`);
    const $ = cheerio.load(data);
    const result = {
      zodiac: zodiac.charAt(0).toUpperCase() + zodiac.slice(1),
      photo: $("body > div > div > div div > div > a > img").attr("src") || "N/A",
      profil: $("div:nth-child(1) > div.zodiak--content__content > p").text().trim() || "N/A",
      kesehatan: $("div:nth-child(2) > div.zodiak--content__content > p").text().trim() || "N/A",
      love: $("div:nth-child(3) > div.zodiak--content__content > p").text().replace("Couple", "\n\n- Couple").replace("Single", "- Single").trim() || "N/A",
      karir: $("div:nth-child(4) > div.zodiak--content__content").text().trim() || "N/A",
      keuangan: $("div:nth-child(5) > div.zodiak--content__content").text().trim() || "N/A",
      angka: $("div:nth-child(1) > div.zodiak--content__content > span").text().trim() || "N/A",
      tanggal: $("div > div > span").text().replace("search", "").trim() || "N/A"
    };
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Terjadi kesalahan saat mengambil data."
    });
  }
}