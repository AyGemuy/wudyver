import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApkpures(q) {
  try {
    const end = "https://m.apkpure.com";
    const url = `${end}/cn/search?q=${encodeURIComponent(q)}&t=app`;
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const searchData = [];
    $("ul.search-res li").each((index, element) => {
      const $element = $(element);
      const obj = {
        link: end + $element.find("a.dd").attr("href"),
        image: $element.find("img").attr("src"),
        name: $element.find(".p1").text().trim(),
        developer: $element.find(".p2").text().trim(),
        tags: $element.find(".tags .tag").map((i, el) => $(el).text().trim()).get(),
        downloadLink: end + $element.find(".right_button a.is-download").attr("href"),
        fileSize: $element.find(".right_button a.is-download").data("dt-filesize"),
        version: $element.find(".right_button a.is-download").data("dt-version"),
        versionCode: $element.find(".right_button a.is-download").data("dt-versioncode")
      };
      searchData.push(obj);
    });
    return searchData;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getApkpure(url) {
  try {
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const linkTag = $('link[rel="canonical"]').attr("href");
    const titleTag = $('meta[property="og:title"]').attr("content");
    const imgTag = $('meta[property="og:image"]').attr("content");
    const downloadURL = `https://d.apkpure.com/b/APK/${linkTag.split("/")[5]}?version=latest`;
    return {
      link: downloadURL,
      title: titleTag,
      img: imgTag
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
        const results = await searchApkpures(query);
        return res.status(200).json(results);
      } else if (action === "get") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const appDetails = await getApkpure(url);
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
  } else {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
}