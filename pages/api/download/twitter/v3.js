import * as cheerio from "cheerio";
import fetch from "node-fetch";
async function SnapTwitter(tweetUrl) {
  try {
    const response = await fetch(`https://snapdownloader.com/tools/twitter-video-downloader/download?url=${encodeURIComponent(tweetUrl)}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const body = await response.text();
    const $ = cheerio.load(body);
    return {
      title: $(".metadata .title").text().trim(),
      duration: $(".metadata .duration").text().replace("Duration: ", "").trim(),
      thumbnail: $(".metadata .thumbnail").attr("src"),
      downloads: $(".downloadsTable tbody tr").map((_, el) => {
        const quality = $(el).find("td").eq(0).text().trim();
        const format = $(el).find("td").eq(1).text().trim();
        const downloadLink = $(el).find("a.downloadBtn").attr("href");
        return downloadLink && downloadLink.includes(quality) ? {
          quality: quality,
          format: format,
          downloadLink: downloadLink
        } : null;
      }).get().filter(Boolean)
    };
  } catch (error) {
    console.error("Error fetching tweet data:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const result = await SnapTwitter(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}