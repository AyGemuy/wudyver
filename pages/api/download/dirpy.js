import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function dirpy(ytUrl) {
  try {
    const response = await fetch(`https://dirpy.com/studio?url=${encodeURIComponent(ytUrl)}&affid=yt2mp3&utm_source=yt2mp3tech&utm_medium=download`, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        "X-CSRFToken": (await (await fetch("https://dirpy.com/studio")).text()).match(/value="([^"]+)"/)[1],
        Referer: ytUrl
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const data = $("div.col-md-6").map((index, el) => {
      const title = $(el).find("h2.panel-title").text().trim();
      const mediaLink = $(el).find("video source").attr("src");
      return {
        title: title,
        mediaLink: mediaLink
      };
    }).get();
    const results = data.filter(v => v.mediaLink);
    if (!results.length) throw new Error("Video tidak ditemukan. Silakan coba URL lain.");
    return results;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const result = await dirpy(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}