import fetch from "node-fetch";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    type
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    if (type === "v1") {
      const url = "https://www.nonstick.com/soundsource/";
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      result = $("div.column.two-third.column_column table tbody tr").map((index, element) => ({
        name: $(element).find("td a").text().trim(),
        link: $(element).find("td a").attr("href")
      })).get().filter(({
        name,
        link
      }) => name !== "" && link !== undefined);
    } else if (type === "v2") {
      const url = "https://www.nonstick.com/sound-archive/";
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      result = $("div.column.one.column_column").map((index, element) => $(element).parent().find("a").map((i, el) => ({
        link: $(el).attr("href"),
        name: $(element).text().trim(),
        quality: $(el).next("b").text().trim(),
        text: $(el).text().trim()
      })).get()).get().flat();
    } else if (type === "list") {
      const {
        url
      } = req.method === "GET" ? req.query : req.body;
      if (!url) {
        return res.status(400).json({
          error: "URL is required for listVoice"
        });
      }
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      result = $("div.column.one.column_column table tbody tr").map((index, element) => ({
        link: $(element).find("td a").attr("href"),
        name: $(element).find("td a b").text().trim(),
        quality: $(element).find("td b").last().text().trim()
      })).get().filter(({
        name,
        link,
        quality
      }) => name !== "" && link !== undefined && quality !== "");
    } else {
      return res.status(400).json({
        error: "Invalid type parameter"
      });
    }
    return res.json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the request"
    });
  }
}