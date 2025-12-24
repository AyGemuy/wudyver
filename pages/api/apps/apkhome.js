import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchApkhome(query) {
  try {
    const url = `https://apkhome.net/id/?s=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const elements = $("li > dl > a");
    return elements.map((index, element) => {
      const anchorElement = $(element);
      return {
        href: anchorElement.attr("href"),
        imageSrc: anchorElement.find(".l img").attr("data-cfsrc") || anchorElement.find(".l img").attr("src"),
        title: anchorElement.find(".r .p1").text().trim(),
        edition: anchorElement.find(".r p:last-of-type").text().trim()
      };
    }).get();
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getApkhome(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const ogImageUrl = $('meta[property="og:image"]').attr("content");
    const gtBlockElement = $("p.gt-block");
    return {
      title: gtBlockElement.find("strong").first().text().trim(),
      description: gtBlockElement.first().text().trim(),
      supportedAndroid: gtBlockElement.filter(':contains("Android yang didukung")').next("br").text().trim(),
      supportedAndroidVersions: gtBlockElement.filter(':contains("Versi Android yang didukung")').next("br").text().trim(),
      ogImageUrl: ogImageUrl,
      downloadLink: $('a[href^="https://dl2.apkhome.net"]').text().trim(),
      downloadLinkURL: $('a[href^="https://dl2.apkhome.net"]').attr("href")
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
      const results = await searchApkhome(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const appDetails = await getApkhome(url);
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