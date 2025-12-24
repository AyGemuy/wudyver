import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class MediaScraper {
  async parseMediaResults(media) {
    return media.map(item => {
      const {
        quality,
        size,
        link
      } = item;
      const baseUrl = "https://9xbuddy.online";
      let formattedLink = link;
      if (link.startsWith("//")) {
        formattedLink = `https:${link}`;
      } else if (!link.startsWith("https:")) {
        formattedLink = `${baseUrl}${link}`;
      }
      return {
        quality: quality.split("Extract")[0].trim().replace("Download Now", ""),
        size: size === "-" ? "Unknown" : size,
        link: formattedLink
      };
    });
  }
  async scrapeData(url) {
    let mediaResults = [];
    let info = {};
    while (mediaResults.length === 0) {
      try {
        const {
          data
        } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/proxy/v1?host=7&url=https://9xbuddy.online/process?url=${encodeURIComponent(url)}`, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        const $ = cheerio.load(data);
        info = {
          title: $("div.text-gray-500.dark\\:text-gray-200").first().text().trim(),
          uploader: $("p:contains('Uploader') span.text-blue-500").text().trim(),
          duration: $("p:contains('Duration') span.text-blue-500").text().trim()
        };
        const results = [];
        $("div.lg\\:flex.lg\\:justify-center.items-center").each((_, el) => {
          const [quality, size, link] = [$(el).find("div:nth-child(2)").text().trim(), $(el).find("div:nth-child(3)").text().trim(), $(el).find("a").attr("href")];
          if (quality && size && link) results.push({
            quality: quality,
            size: size,
            link: link
          });
        });
        if (results.length > 0) {
          mediaResults = await this.parseMediaResults(results);
        }
      } catch (em) {
        console.error("Error:", em.message);
        break;
      }
    }
    return {
      media: mediaResults,
      info: info
    };
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const scraper = new MediaScraper();
  try {
    const results = await scraper.scrapeData(url);
    return res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}