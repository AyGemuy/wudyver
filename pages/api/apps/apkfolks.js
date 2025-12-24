import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchApp(query) {
  const url = `https://apkfolks.com/?s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    return $("article").map((index, element) => ({
      articleId: $(element).attr("id"),
      articleClass: $(element).attr("class"),
      headline: $(element).find("h2.entry-title a").text().trim(),
      headlineLink: $(element).find("h2.entry-title a").attr("href"),
      dateModified: $(element).find("time.updated").attr("datetime"),
      datePublished: $(element).find("time.entry-date.published").attr("datetime"),
      author: $(element).find(".author-name").text().trim()
    })).get();
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getApp(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const link = $(".wp-block-button__link").attr("href");
    const linkdl = await getAppDown(link);
    const description = $(".entry-content p").first().text();
    const versionInfoTable = $("table").first();
    const versionInfo = {};
    versionInfoTable.find("tr").each((index, element) => {
      const key = $(element).find("td").first().text();
      const value = $(element).find("td").last().text();
      versionInfo[key] = ": " + value;
    });
    const downloadSection = $('h2:contains("Download")').parent();
    const downloadInfo = {};
    downloadSection.find("p").each((index, element) => {
      const key = $(element).find("strong").text().replace(":", "");
      const value = $(element).find("a").attr("href");
      downloadInfo[key] = value;
    });
    return {
      title: $('meta[property="og:title"]').attr("content"),
      image: $('meta[property="og:image"]').attr("content"),
      url: $('meta[property="og:url"]').attr("content"),
      link: link,
      download: downloadInfo,
      description: description,
      versionInfo: versionInfo
    };
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
async function getAppDown(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const downloadSection = $(".entry-content .su-box.su-box-style-default");
    const image = downloadSection.find(".wp-block-image img").attr("src");
    const versionInfoTable = downloadSection.find(".wp-block-table");
    const versionInfo = {};
    versionInfoTable.find("tr").each((index, element) => {
      const key = $(element).find("td").eq(0).text();
      const value = $(element).find("td").eq(1).text();
      versionInfo[key] = value;
    });
    const downloadInfo = {};
    downloadSection.find(".wp-block-button a").each((index, element) => {
      const key = `${index + 1}`;
      const value = $(element).attr("href");
      downloadInfo[key] = value;
    });
    return {
      image: image,
      versionInfo: versionInfo,
      downloadInfo: downloadInfo
    };
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
      const appDetails = await getApp(url);
      return res.status(200).json(appDetails);
    } else if (action === "download") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const downloadDetails = await getAppDown(url);
      return res.status(200).json(downloadDetails);
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