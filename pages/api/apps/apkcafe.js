import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApp(query) {
  const url = `https://apk.cafe/ajax/apk-search.php?s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];
    $(".sugg_row").each((index, element) => {
      const $element = $(element);
      const app = {
        href: $element.find(".sugg_img").attr("href"),
        imgUrl: $element.find(".sugg_img img").attr("src"),
        name: $element.find(".sugg_text").text(),
        rightHref: $element.find(".sugg_right").attr("href")
      };
      results.push(app);
    });
    return results;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getInfo(url) {
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const appDetails = [];
    const promises = $("li.dwn_up").map(async (index, element) => {
      const downloadLink = $(element).find("a.dwn1").attr("href");
      if (downloadLink.includes("https://apk.cafe/download?file_id")) {
        const fileSize = $(element).find("a.dwn1 span").text().trim();
        const deviceInfo = $(element).find("div.additional_file_info b").text().trim();
        const androidVersion = $(element).find("div.additional_file_info .f_ifo:last-child").text().trim();
        const download = await getDetails(downloadLink);
        const app = {
          title: $('meta[property="og:title"]').attr("content"),
          image: $('meta[property="og:image"]').attr("content"),
          url: $('meta[property="og:url"]').attr("content"),
          downloadLink: downloadLink,
          fileSize: fileSize,
          deviceInfo: deviceInfo,
          androidVersion: androidVersion,
          download: download
        };
        appDetails.push(app);
      }
    }).get();
    await Promise.all(promises);
    return {
      version: appDetails
    };
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
async function getDetails(url) {
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const appDetails = {};
    appDetails.downloadText = $(".text_up2 .text_up").text().trim();
    appDetails.directLink = $(".text_up2 .download_text a.dwnDirect").attr("href");
    const apkTechnicalInfo = {};
    $(".dwn_params_wrap .dwn_params li").each((index, element) => {
      const key = $(element).find("b").text().trim().replace(":", "");
      const value = $(element).text().replace(key, "").trim();
      apkTechnicalInfo[key] = value;
    });
    appDetails.apkTechnicalInfo = apkTechnicalInfo;
    return appDetails;
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