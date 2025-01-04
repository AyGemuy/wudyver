import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApkgod(query) {
  const url = `https://apkgod.co/?s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const items = [];
    $("article.flex-item").each((index, element) => {
      const $element = $(element);
      const item = {
        title: $element.find(".app-name h3").text().trim(),
        image: $element.find(".app-icon img").attr("src"),
        version: $element.find(".app-name .has-small-font-size").first().text().trim(),
        tags: $element.find(".app-tags .app-tag").map((index, tag) => $(tag).text().trim()).get(),
        link: $element.find("a.app").attr("href")
      };
      items.push(item);
    });
    return items;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getLinkDown(url) {
  try {
    const response = await fetch(randomProxyUrl + (url.endsWith("/download") ? url : url + "/download"));
    const html = await response.text();
    const $ = cheerio.load(html);
    const downloadList = $(".download-list.margin-top-15");
    const results = [];
    downloadList.find("details").each((index, element) => {
      const downloadItem = $(element).find(".download-item");
      const icon = downloadItem.find(".download-item-icon img").attr("src");
      const name = downloadItem.find(".download-item-name .has-vivid-cyan-blue-color").text().trim();
      const link = $(element).find(".collapsible-body .wp-block-button__link").attr("href");
      results.push({
        icon: icon,
        name: name,
        link: link
      });
    });
    return results;
  } catch (error) {
    throw new Error(`Scraping failed: ${error}`);
  }
}
async function getResultLink(url) {
  try {
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const entryContent = $(".entry-block.entry-content.main-entry-content");
    const appIcon = entryContent.find(".app-icon img").attr("src");
    const appName = entryContent.find(".app-name .app-box-name-heading h1").text().trim();
    const appVersion = appName.match(/\[Latest\]$/i) ? "Latest" : "";
    const appRating = entryContent.find(".app-name .rating span.star.active").length;
    const downloadButton = $("#download-button").attr("href");
    return {
      icon: appIcon,
      title: appName,
      version: appVersion,
      rating: appRating,
      link: downloadButton
    };
  } catch (error) {
    throw new Error(`Scraping failed: ${error}`);
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
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
        const results = await searchApkgod(query);
        return res.status(200).json(results);
      } else if (action === "getDownloadLinks") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const downloadLinks = await getLinkDown(url);
        return res.status(200).json(downloadLinks);
      } else if (action === "getResult") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const resultLink = await getResultLink(url);
        return res.status(200).json(resultLink);
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