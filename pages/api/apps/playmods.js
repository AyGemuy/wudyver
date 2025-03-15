import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchApp(query) {
  try {
    const url = `https://m.playmods.net/id/search/${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const dataArray = [];
    $("a.beautify.ajax-a-1").each((index, element) => {
      const $element = $(element);
      const data = {
        link: "https://m.playmods.net" + $element.attr("href"),
        title: $element.find(".common-exhibition-list-detail-name").text().trim(),
        detail: $element.find(".common-exhibition-list-detail-txt").text().trim(),
        image: $element.find(".common-exhibition-list-icon img").attr("data-src")
      };
      dataArray.push(data);
    });
    return dataArray;
  } catch (error) {
    console.error("Error in searchApp:", error);
    return [];
  }
}
async function getApp(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    return {
      title: $("h1.name").text().trim(),
      image: $(".icon").attr("src"),
      name: $(".app-name span").text().trim(),
      score: $(".score").text().trim(),
      edisi: $(".edition").text().trim(),
      size: $(".size .operate-cstTime").text().trim(),
      create: $(".size span").text().trim(),
      link: $("a.a_download").attr("href"),
      detail: $(".game-describe-gs").text().trim(),
      screenshots: $(".swiper-slide img").map((index, element) => $(element).attr("data-src")).get(),
      describe: $(".datail-describe-pre div").text().trim()
    };
  } catch (error) {
    console.error("Error in getApp:", error);
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
      const results = await searchApp(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      const result = await getApp(query);
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