import * as cheerio from "cheerio";
import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    error: "Query is required"
  });
  try {
    const response = await fetch(`https://cooltext.com/Search?Query=${query}`);
    if (!response.ok) throw new Error("Failed to fetch data");
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = $(".SearchLink").map(function() {
      const link = "https://cooltext.com/" + $(this).attr("href");
      return {
        title: $(this).find(".SearchResult b").text(),
        link: link
      };
    }).get().filter(result => result.link.startsWith("https://cooltext.com/Logo-"));
    return res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}