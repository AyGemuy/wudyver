import fetch from "node-fetch";
import * as cheerio from "cheerio";
class SaveTik {
  async download(videoUrl) {
    try {
      const url = "https://savetik.co/api/ajaxSearch";
      const params = new URLSearchParams({
        q: videoUrl,
        lang: "en"
      });
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "*/*",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://savetik.co/en"
        },
        body: params
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const $ = cheerio.load(result.data);
      return $(".video-data").map((i, el) => {
        const thumbnail = $(el).find(".image-tik img").attr("src") || "No thumbnail";
        const title = $(el).find(".content h3").text().trim() || "No title";
        const downloadLinks = $(el).find(".dl-action a").map((i, em) => {
          const link = $(em).attr("href") || "";
          if (!link) return null;
          return {
            text: $(em).text().trim() || "No text",
            link: link || "No URL"
          };
        }).get().filter(Boolean);
        return downloadLinks.length ? {
          thumbnail: thumbnail,
          title: title,
          downloadLinks: downloadLinks
        } : null;
      }).get().filter(Boolean);
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const savetik = new SaveTik();
    const data = await savetik.download(url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}