import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApp(query) {
  const proxyUrl = randomProxyUrl;
  const bkurl = `https://apkgk.com/search/?keyword=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(`${proxyUrl}${encodeURIComponent(bkurl)}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const items = [];
    $("li").each((index, element) => {
      const item = {
        href: "https://apkgk.com" + $("a", element).attr("href"),
        title: $("a", element).attr("title"),
        imageSrc: "https:" + $("img", element).attr("data-src"),
        date: $(".info-img-dt", element).text().trim()
      };
      if (Object.values(item).every(value => value !== undefined)) {
        items.push(item);
      }
    });
    return items;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function infoApp(url) {
  const proxyUrl = randomProxyUrl;
  try {
    const response = await fetch(proxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    return {
      version: $("div.version span").text().trim(),
      category: $("div.Category span").text().trim(),
      lastUpdated: $("div.last-updated time").text().trim(),
      installs: $("div.Installs a").text().trim(),
      developer: $("div.developer span").text().trim(),
      requires: $("div.Requirements div.item").text().trim(),
      rating: $("div.Content-Rating div.item").text().trim(),
      googlePlay: $("div.Get-it-on a").attr("href"),
      apkLink: "https://apkgk.com" + $("div.detail-box-download a").attr("href"),
      ogImageUrl: $('meta[property="og:image"]').attr("content")
    };
  } catch (error) {
    console.log("Error:", error);
    return null;
  }
}
async function getApp(url) {
  const proxyUrl = randomProxyUrl;
  try {
    const response = await fetch(proxyUrl + (url.endsWith("/download") ? url : url + "/download"));
    const html = await response.text();
    const $ = cheerio.load(html);
    const info = await infoApp(proxyUrl + url.replace(/\/download$/, ""));
    return {
      title: $("div.program-title h1").text().trim(),
      info: info,
      link: proxyUrl + "https:" + $("div.c-download a").attr("href")
    };
  } catch (error) {
    console.log("Error:", error);
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