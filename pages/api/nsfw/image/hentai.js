import * as cheerio from "cheerio";
import fetch from "node-fetch";
const getHentaiList = async () => {
  try {
    const page = Math.floor(1153 * Math.random());
    const response = await fetch(`https://sfmcompile.club/page/${page}`);
    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);
    const hasil = [];
    $("#primary > div > div > ul > li > article").each(function(a, b) {
      hasil.push({
        title: $(b).find("header > h2").text(),
        link: $(b).find("header > h2 > a").attr("href"),
        category: $(b).find("header > div.entry-before-title > span > span").text().replace("in ", ""),
        share_count: $(b).find("header > div.entry-after-title > p > span.entry-shares").text(),
        views_count: $(b).find("header > div.entry-after-title > p > span.entry-views").text(),
        type: $(b).find("source").attr("type") || "image/jpeg",
        video_1: $(b).find("source").attr("src") || $(b).find("img").attr("data-src"),
        video_2: $(b).find("video > a").attr("href") || ""
      });
    });
    return hasil;
  } catch (error) {
    console.error("Error fetching hentai list:", error);
    throw new Error("Terjadi kesalahan saat mengambil daftar video hentai dari sfmcompile.club.");
  }
};
export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const hentaiList = await getHentaiList();
      return res.status(200).json(hentaiList);
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method not allowed"
    });
  }
}