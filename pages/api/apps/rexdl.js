import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchRexdl(query) {
  const url = `https://rexdl.com/?s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];
    $("article").each((index, element) => {
      const $article = $(element);
      const articleData = {
        thumbnail: $article.find(".post-thumbnail img").attr("data-src"),
        categories: $article.find(".post-category a").map((index, el) => $(el).text()).get(),
        date: $article.find(".post-date time").attr("datetime"),
        author: $article.find(".post-byline .author a").text(),
        title: $article.find(".post-title a").text(),
        titleUrl: $article.find(".post-title a").attr("href"),
        excerpt: $article.find(".entry p").text().trim()
      };
      articles.push(articleData);
    });
    return articles;
  } catch (error) {
    console.error("Error in searchRexdl:", error);
    return [];
  }
}
async function getRexdl(url) {
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const dlbox = $("#dlbox");
    const headingText = $(".entry-inner").text();
    const headingTitle = headingText.split(",")[0];
    const downloadLink = $(".readdownload a").attr("href");
    const imageData = dlbox.find("img").attr("data-src");
    const dlList = dlbox.find(".dl-list");
    const info = {
      imageData: imageData,
      headingTitle: headingTitle,
      headingText: headingText,
      downloadLink: downloadLink,
      version: dlList.find(".dl-version span").text().trim(),
      fileSize: dlList.find(".dl-size span").text().trim(),
      sourceLink: dlList.find(".dl-source a").attr("href")
    };
    const resdown = await fetch(randomProxyUrl + encodeURIComponent(info.downloadLink));
    const htmldown = await resdown.text();
    const $down = cheerio.load(htmldown);
    const dlboxdown = $down("#dlbox");
    const apkUrls = dlboxdown.find("a").map((index, element) => $down(element).attr("href")).get().filter(url => url.endsWith(".apk"));
    return {
      info: info,
      download: {
        apkUrls: apkUrls,
        updated: dlboxdown.find("li.dl-update span").eq(1).text(),
        currentVersion: dlboxdown.find("li.dl-version span").eq(1).text(),
        fileSizeDownload: dlboxdown.find("li.dl-size span").eq(1).text(),
        password: dlbox.find("li.dl-key span.txt-dl-list").text()
      }
    };
  } catch (error) {
    console.error("Error in getRexdl:", error);
    return {};
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
      const results = await searchRexdl(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      const result = await getRexdl(query);
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