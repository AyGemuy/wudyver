import fetch from "node-fetch";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const url = `https://rimbakita.com/daftar-nama-hewan-lengkap/${Math.floor(20 * Math.random()) + 1}/`;
  try {
    const html = await (await fetch(url)).text();
    const $ = cheerio.load(html);
    const json = $("div.entry-content.entry-content-single img[class*=wp-image-][data-src]").map((_, el) => {
      const src = $(el).attr("data-src"),
        title = src.split("/").pop().replace(/-/g, " ").replace(/\..+$/, "");
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        url: src
      };
    }).get();
    return res.status(200).json(json);
  } catch {
    res.status(500).json({
      error: "Failed to fetch data"
    });
  }
}