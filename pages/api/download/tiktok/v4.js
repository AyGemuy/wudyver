import fetch from "node-fetch";
import * as cheerio from "cheerio";
class TikTokIO {
  async down(videoUrl) {
    try {
      const response = await fetch("https://tiktokio.com/api/v1/tk-htmx", {
        method: "POST",
        headers: {
          "HX-Request": "true",
          "HX-Trigger": "search-btn",
          "HX-Target": "tiktok-parse-result",
          "HX-Current-URL": "https://tiktokio.com/id/",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://tiktokio.com/id/",
        },
        body: new URLSearchParams({
          prefix: "dtGslxrcdcG9raW8uY29t",
          vid: videoUrl,
        }),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();
      const $ = cheerio.load(html);
      const results = $(".tk-down-link a")
        .map((_, el) => {
          const $el = $(el);
          return {
            text: $el.text(),
            url: $el.attr("href"),
            quality: $el.text().includes("(HD)") ? "HD" : "Normal",
          };
        })
        .get()
        .filter((v) => v.url.startsWith("https"));
      return {
        medias: results,
      };
    } catch (error) {
      console.error("Error in TikTokIO down:", error);
      throw error;
    }
  }
}
const tikTokIO = new TikTokIO();

const tiktokio = async (videoUrl) => {
  try {
    return await tikTokIO.down(videoUrl);
  } catch (error) {
    console.error("Error during download:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: "No url provided" });

  const result = await tiktokio(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
