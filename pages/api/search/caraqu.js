import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchCaraqu(query) {
  try {
    const url = `https://www.caraqu.com/?s=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const html = await response.text();
    const $ = cheerio.load(html);
    return $("#posts-container .post-item").map((_, el) => {
      const postElement = $(el);
      return {
        title: postElement.find(".post-title a").text().trim() || "",
        link: postElement.find(".post-title a").attr("href") || "",
        excerpt: postElement.find(".post-excerpt").text().trim() || "",
        image: postElement.find(".post-thumb img").attr("src") || ""
      };
    }).get() || [];
  } catch (error) {
    console.error("Error fetching data from Caraqu:", error);
    return [];
  }
}
async function detailCaraqu(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const html = await response.text();
    const $ = cheerio.load(html);
    const content = $(".entry-content.entry").clone();
    content.find("script, style").remove();
    content.find("*").contents().filter((_, el) => el.nodeType === 3 && !el.nodeValue.trim()).remove();
    return {
      title: $(".post-title.entry-title").text().trim() || "",
      author: $(".author-meta .meta-author a").text().trim() || "",
      lastUpdated: $("#single-post-meta .last-updated").text().replace("Last Updated: ", "").trim() || "",
      content: content.text().trim() || "",
      ogImage: $('meta[property="og:image"]').attr("content") || "",
      breadcrumb: $("#breadcrumb a").map((_, el) => ({
        text: $(el).text().trim() || "",
        url: $(el).attr("href") || ""
      })).get() || []
    };
  } catch (error) {
    console.error("Error fetching article details:", error);
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
      if (action === "search") {
        const results = await searchCaraqu(query);
        return res.status(200).json(results);
      } else if (action === "detail") {
        const articleDetails = await detailCaraqu(query);
        return res.status(200).json(articleDetails);
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