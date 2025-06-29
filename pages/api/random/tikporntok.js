import fetch from "node-fetch";
import * as cheerio from "cheerio";
const getTikPornData = async () => {
  try {
    const response = await fetch("https://tikporntok.com/?random=1");
    if (!response.ok) throw new Error(`Failed to fetch page: ${response.statusText}`);
    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);
    const results = [];
    $(".swiper-slide").each((index, element) => {
      const title = $(element).attr("data-title") || "No title available";
      const video = $(element).find("source").attr("src") || $(element).find("video").attr("src");
      const thumb = $(element).find("img").attr("src") || "No thumbnail available";
      const desc = $(element).find(".shorts_events > p").text().trim() || "No description available";
      const views = $(element).find(`#video-views-count-${index}`).text() || "0 views";
      results.push({
        title: title,
        video: video,
        thumb: thumb,
        desc: desc,
        views: views
      });
    });
    if (results.length === 0) throw new Error("No data found on the page");
    return results;
  } catch (error) {
    throw new Error(`Error fetching TikPornTok data: ${error.message}`);
  }
};
export default async function handler(req, res) {
  try {
    const data = await getTikPornData();
    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}