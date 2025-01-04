import fetch from "node-fetch";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    action,
    keyword,
    link
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' diperlukan."
    });
  }
  if (action === "search") {
    if (!keyword) {
      return res.status(400).json({
        error: "Parameter 'keyword' diperlukan untuk pencarian."
      });
    }
    try {
      const response = await fetch(`https://www.whatsapgrup.com/search?q=${encodeURIComponent(keyword)}`);
      const html = await response.text();
      const $ = cheerio.load(html);
      const links = $(".blog-posts .blog-post.hentry .post-title a").map((_, element) => {
        const title = $(element).text().trim();
        const href = $(element).attr("href");
        return {
          title: title,
          link: href
        };
      }).get();
      return res.status(200).json({
        results: links
      });
    } catch (error) {
      console.error("Error fetching search results:", error);
      return res.status(500).json({
        error: "Terjadi kesalahan saat mencari grup."
      });
    }
  }
  if (action === "details") {
    if (!link) {
      return res.status(400).json({
        error: "Parameter 'link' diperlukan untuk mengambil detail."
      });
    }
    try {
      const response = await fetch(link);
      const html = await response.text();
      const $ = cheerio.load(html);
      const details = $("div.post-body.post-content").children().map((_, element) => {
        const text = $(element).text().trim();
        if (text.includes("Link")) {
          const title = text.split("-")[0].trim();
          const linkElement = $(element).find("a");
          if (linkElement.length > 0) {
            const href = linkElement.attr("href").trim();
            return {
              title: title,
              link: href
            };
          }
        }
        return null;
      }).get().filter(detail => detail && detail.link.includes("chat.whatsapp.com"));
      return res.status(200).json({
        results: details
      });
    } catch (error) {
      console.error("Error fetching details:", error);
      return res.status(500).json({
        error: "Terjadi kesalahan saat mengambil detail grup."
      });
    }
  }
  return res.status(400).json({
    error: "Action tidak valid."
  });
}