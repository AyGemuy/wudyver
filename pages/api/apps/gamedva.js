import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchApp(query) {
  const url = `https://gamedva.com/?s=${encodeURIComponent(query)}&asl_active=1&p_asl_data=1&customset[]=post&asl_gen[]=title&polylang_lang=en&qtranslate_lang=0&filters_initial=1&filters_changed=0`;
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];
    $("article.ap-post.ap-lay-c").each((index, element) => {
      const result = {
        title: $(element).find(".entry-title").text().trim(),
        link: $(element).find("a").attr("href"),
        image: $(element).find(".meta-image img").attr("src"),
        version: $(element).find(".entry-excerpt").text().trim()
      };
      results.push(result);
    });
    return results;
  } catch (error) {
    console.error("Error fetching search results:", error);
    return [];
  }
}
async function getDownloadInfo(url) {
  const hasQueryString = url.includes("?");
  const hasDownloadFileParam = url.includes("?download&file=0");
  url = hasQueryString ? hasDownloadFileParam ? url : url + "&download&file=0" : url + "?download&file=0";
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    let title, links, image, description, author;
    $("meta[property]").each((index, element) => {
      const property = $(element).attr("property");
      const content = $(element).attr("content");
      switch (property) {
        case "og:title":
          title = content;
          break;
        case "og:url":
          links = content;
          break;
        case "og:image":
          image = content;
          break;
        case "og:description":
          description = content;
          break;
        case "article:author":
          author = content;
          break;
      }
    });
    const metaData = {
      title: title,
      links: links,
      image: image,
      description: description,
      author: author
    };
    const linkElement = $("a#download-now");
    return {
      link: linkElement.attr("href"),
      info: linkElement.find(".progress-text").text().trim(),
      detail: metaData
    };
  } catch (error) {
    console.error("Error fetching download info:", error);
    throw new Error("Failed to fetch download information");
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    query
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (action === "search") {
      const results = await searchApp(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      const result = await getDownloadInfo(query);
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
}