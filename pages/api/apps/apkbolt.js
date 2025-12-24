import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchApp(query) {
  const url = `https://apkbolt.com/?s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];
    $("article.vce-post").each((index, element) => {
      const $element = $(element);
      const article = {
        imageURL: $element.find(".meta-image img").attr("src"),
        title: $element.find(".entry-title a").text().trim(),
        link: $element.find(".entry-title a").attr("href"),
        categories: $element.find(".meta-category a").map((_, el) => $(el).text().trim()).get()
      };
      articles.push(article);
    });
    return articles;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getInfo(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const mediaText = $(".wp-block-media-text");
    mediaText.find(".wp-block-media-text__content script").remove();
    const downloadLink = $(".redirect-press-final-link").attr("href");
    const downloadFile = await getApp(downloadLink);
    return {
      name: $('meta[property="og:title"]').attr("content"),
      image: $('meta[property="og:image"]').attr("content"),
      link: $('meta[property="og:url"]').attr("content"),
      downloadLink: downloadLink,
      downloadFile: downloadFile
    };
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
async function getApp(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const mainWrapper = $("#main-wrapper");
    mainWrapper.find("script").remove();
    return mainWrapper.find("a").attr("href");
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (action === "search") {
      if (!query) {
        return res.status(400).json({
          message: "Query is required"
        });
      }
      const results = await searchApp(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const appInfo = await getInfo(url);
      return res.status(200).json(appInfo);
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