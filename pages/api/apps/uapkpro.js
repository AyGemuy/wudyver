import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchUapkpro(query) {
  try {
    const url = `https://uapk.pro/?s=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const result = [];
    $(".col-md-2.col-sm-4.col-xs-6").each((index, element) => {
      const obj = {
        title: $(element).find(".inner-box a[href]").text().trim(),
        url: $(element).find(".inner-box a[href]").attr("href"),
        category: $(element).find(".detail .sub-detail a").text().trim(),
        rating: $(element).find(".detail .display-rating").text().trim(),
        downloadUrl: $(element).find("a[href].anchor-hover").attr("href")
      };
      result.push(obj);
    });
    return result;
  } catch (error) {
    console.error("Error in searchUapkpro:", error);
    return [];
  }
}
async function getUapkpro(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const ogImageUrl = $('meta[property="og:image"]').attr("content");
    return {
      supportedAndroid: $("p strong").text().trim(),
      title: $("h1").text().trim(),
      downloadLink: $("p a").attr("href"),
      ogImageUrl: ogImageUrl
    };
  } catch (error) {
    console.error("Error in getUapkpro:", error);
    return null;
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
      const results = await searchUapkpro(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      const result = await getUapkpro(query);
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