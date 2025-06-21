import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchDongeng(q) {
  try {
    const url = "https://dongengceritarakyat.com/?s=" + encodeURIComponent(q);
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);
    const results = [];
    $("article").each((index, element) => {
      const article = $(element);
      const result = {
        entryTitle: article.find(".entry-title a").text().trim(),
        link: article.find(".entry-title a").attr("href"),
        imageSrc: article.find(".featured-image amp-img").attr("src"),
        entrySummary: article.find(".entry-summary").text().trim(),
        footerTag: article.find(".cat-links a").text().trim(),
        from: article.find(".tags-links a").text().trim()
      };
      results.push(result);
    });
    return results;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function readDongeng(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    return {
      image: $("div.featured-image amp-img").attr("src"),
      title: $("h1.entry-title").text().trim(),
      date: $("span.posted-date").text().trim(),
      author: $("span.posted-author a").text().trim(),
      content: $("div.entry-content").text().trim(),
      tag: $("span.tags-links a").text().trim(),
      cat: $("span.cat-links a").text().trim()
    };
  } catch (error) {
    console.error("Error reading dongeng:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      action,
      query
    } = req.method === "GET" ? req.query : req.body;
    try {
      if (action === "searchDongeng") {
        const results = await searchDongeng(query);
        return res.status(200).json(results);
      } else if (action === "readDongeng") {
        const result = await readDongeng(query);
        return res.status(200).json(result);
      } else {
        return res.status(400).json({
          message: "Invalid action"
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message
      });
    }
  } else {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
}