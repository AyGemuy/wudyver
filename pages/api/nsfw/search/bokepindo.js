import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchBokepindo(s) {
  try {
    const response = await fetch("https://bokepindo13.pro/?s=" + encodeURIComponent(s));
    if (!response.ok) throw new Error("Failed to fetch data");
    const $ = cheerio.load(await response.text());
    return $("article[data-video-uid]").map((index, element) => ({
      videoUid: $(element).attr("data-video-uid"),
      postId: $(element).attr("data-post-id"),
      title: $(element).find("a").attr("title"),
      thumbnailSrc: $(element).find("img").attr("data-src"),
      hdVideo: $(element).find(".hd-video").text(),
      views: $(element).find(".views").text(),
      duration: $(element).find(".duration").text(),
      videoLink: $(element).find("a").attr("href")
    })).get();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}
async function streamBokepindo(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const $ = cheerio.load(await response.text());
    return $("#bkpdo-player-container iframe").attr("src");
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
        const results = await searchBokepindo(query);
        return res.status(200).json(results);
      } else if (action === "stream") {
        const videoSrc = await streamBokepindo(query);
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