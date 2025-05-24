import * as cheerio from "cheerio";
import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    query,
    page
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    error: "Query is required."
  });
  const pageNumber = parseInt(page, 10) || 1;
  if (pageNumber < 1 || pageNumber > 70) return res.status(400).json({
    error: "Invalid page number. Please use a page number between 1 and 70."
  });
  try {
    const baseUrl = pageNumber === 1 ? `https://api.flamingtext.com/All-Logos/?text=${query}` : `https://api.flamingtext.com/All-Logos/page${pageNumber}?text=${query}`;
    const response = await fetch(baseUrl);
    if (!response.ok) throw new Error(`Failed to fetch data, status code: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = $(".ft-logo").map((index, element) => {
      const anchor = $(element).find("a");
      const img = $(element).find("img");
      const link = "https://api.flamingtext.com" + anchor.attr("href");
      const linkImage = "https://api.flamingtext.com" + img.attr("logo-src");
      const textParam = new URLSearchParams(linkImage.split("?")[1]).get("script");
      return {
        title: textParam ? textParam.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "",
        link: link,
        linkImage: linkImage,
        page: pageNumber,
        index: index + 1
      };
    }).get().filter(url => url.linkImage.includes("api.flamingtext.com/net-fu"));
    return res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: `An error occurred: ${error.message}`
    });
  }
}