import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApkhouse(query) {
  try {
    const url = `https://apk.house/?s=${encodeURIComponent(query)}`;
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    return $(".bloque-app").map((index, element) => {
      const appElement = $(element);
      const linkElement = appElement.find("a");
      const imageElement = appElement.find("img");
      const titleElement = appElement.find(".title");
      const developerElement = appElement.find(".developer");
      const versionElement = appElement.find(".version");
      const ratingElement = appElement.find(".stars");
      return {
        href: linkElement.attr("href"),
        imageSrc: imageElement.attr("data-src"),
        alt: imageElement.attr("alt"),
        title: titleElement.text().trim(),
        developer: developerElement.text().trim(),
        version: versionElement.text().trim(),
        rating: ratingElement.attr("style")?.replace("width:", "").replace("%", "").trim() || "N/A"
      };
    }).get();
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getApkhouse(url) {
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url.endsWith("?download=links") ? url : url + "?download=links"));
    const html = await response.text();
    const $ = cheerio.load(html);
    return $(".bx-download li").map((index, element) => {
      const linkElement = $(element).find("a");
      return {
        link: linkElement.attr("href"),
        text: linkElement.text().trim(),
        ogImageUrl: $('meta[property="og:image"]').attr("content")
      };
    }).get();
  } catch (error) {
    console.error("Error:", error);
    return [];
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
      const results = await searchApkhouse(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const appDetails = await getApkhouse(url);
      return res.status(200).json(appDetails);
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