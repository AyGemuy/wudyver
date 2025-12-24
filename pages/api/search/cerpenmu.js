import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function getCategories() {
  try {
    const response = await fetch("https://cerpenmu.com");
    if (!response.ok) throw new Error("Failed to fetch data");
    const $ = cheerio.load(await response.text());
    return $(".cat-item").map((_, el) => ({
      name: $(el).find("a").text().trim(),
      link: $(el).find("a").attr("href"),
      count: parseInt($(el).text().replace(/\D/g, "") || "0")
    })).get();
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    throw error;
  }
}
const getArticles = async url => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const $ = cheerio.load(await response.text());
    const articles = $("article.post").map((_, el) => ({
      title: $(el).find("h2 a").text().trim(),
      link: $(el).find("h2 a").attr("href"),
      author: $(el).find('a[rel="tag"]').text().trim(),
      published: $(el).text().match(/Lolos Moderasi Pada: (.*)/)[1].trim(),
      summary: $(el).find("blockquote").text().trim()
    })).get();
    const pagesMatch = $(".wp-pagenavi .pages").text().match(/Page \d+ of (\d+):/);
    const pages = pagesMatch ? parseInt(pagesMatch[1]) : 1;
    return {
      articles: articles,
      pages: pages
    };
  } catch (error) {
    console.error("Error fetching articles:", error);
    throw error;
  }
};
async function getArticleDetails(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const body = await response.text();
    const $ = cheerio.load(body);
    return {
      title: $("article.post h1").text().trim(),
      author: $('a[rel="tag"]').first().text().trim(),
      categories: $('a[rel="category tag"]').map((_, el) => $(el).text().trim()).get(),
      content: $("article.post p").text().trim()
    };
  } catch (error) {
    console.error("Failed to fetch article details:", error);
    throw error;
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
      if (action === "getCategories") {
        const categories = await getCategories();
        return res.status(200).json(categories);
      } else if (action === "getArticles") {
        const articlesData = await getArticles(query);
        return res.status(200).json(articlesData);
      } else if (action === "getArticleDetails") {
        const articleDetails = await getArticleDetails(query);
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