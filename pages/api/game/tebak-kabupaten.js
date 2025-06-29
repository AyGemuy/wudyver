import fetch from "node-fetch";
import * as cheerio from "cheerio";
const baseUrl = "https://id.m.wikipedia.org";
async function fetchImageUrl(url) {
  try {
    const html = await (await fetch(url)).text();
    const $ = cheerio.load(html);
    return "https:" + $("tr.mergedtoprow td.infobox-full-data.maptable div.ib-settlement-cols-row div.ib-settlement-cols-cell a.mw-file-description img.mw-file-element").attr("src") || null;
  } catch (error) {
    return null;
  }
}
export default async function handler(req, res) {
  try {
    const html = await (await fetch(baseUrl + "/wiki/Daftar_kabupaten_di_Indonesia")).text();
    const $ = cheerio.load(html);
    const kabupatenList = $('td a[href^="/wiki/Kabupaten"]').map((_, element) => ({
      link: baseUrl + $(element).attr("href"),
      name: $(element).attr("title")
    })).get().filter(({
      link,
      name
    }) => link && name);
    if (kabupatenList.length === 0) return res.status(404).json({
      error: "No kabupaten found"
    });
    const randomKabupaten = kabupatenList[Math.floor(Math.random() * kabupatenList.length)];
    const imageUrl = await fetchImageUrl(randomKabupaten.link);
    const judulBaru = randomKabupaten.name.replace("Kabupaten ", "");
    const ukuranBaru = imageUrl ? imageUrl.replace(/\/\d+px-/, "/1080px-") : null;
    return res.status(200).json({
      link: randomKabupaten.link,
      title: judulBaru,
      url: ukuranBaru
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch kabupaten data"
    });
  }
}