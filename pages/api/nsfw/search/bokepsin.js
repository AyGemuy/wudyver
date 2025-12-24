import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchBokepsin(q) {
  try {
    const url = "https://bokepsin.website/search/" + encodeURIComponent(q);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const html = await response.text();
    const $ = cheerio.load(html);
    return $(".video-block").map((index, element) => ({
      title: $(element).find(".title").text(),
      imageUrl: $(element).find(".video-img").attr("data-src"),
      videoUrl: $(element).find(".thumb").attr("href"),
      views: $(element).find(".views-number").text().trim(),
      duration: $(element).find(".duration").text().trim()
    })).get();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}
async function streamBokepsin(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const html = await response.text();
    const embedUrl = cheerio.load(html)('meta[itemprop="embedURL"]').attr("content");
    return embedUrl.startsWith("//") ? `https:${embedUrl}` : embedUrl;
  } catch (error) {
    console.error("Error fetching video src:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      action,
      query
    } = req.method === "GET" ? req.query : req.body;
    try {
      if (action === "search") {
        const results = await searchBokepsin(query);
        return res.status(200).json(results);
      } else if (action === "stream") {
        const videoSrc = await streamBokepsin(query);
        return res.status(200).json({
          videoSrc: videoSrc
        });
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