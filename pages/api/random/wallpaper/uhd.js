import axios from "axios";
import * as cheerio from "cheerio";
class UhdPaper {
  async search(query) {
    const {
      data
    } = await axios.get(`https://www.uhdpaper.com/search?q=${encodeURIComponent(query)}&by-date=true&i=0&m=1`);
    const $ = cheerio.load(data);
    return $(".blog-posts .post-outer-container").map((_, el) => ({
      title: $(el).find(".snippet-title h2").text(),
      link: $(el).find("a").attr("href")
    })).get();
  }
  async download(url) {
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const links = $(".tabcontent a").map((_, el) => $(el).attr("href")).get();
    return Promise.all(links.map(async link => {
      try {
        const {
          request,
          headers
        } = await axios.get(link, {
          maxRedirects: 10,
          headers: {
            Referer: url
          }
        });
        return {
          url: request.res.responseUrl || link,
          size: headers["content-length"] || "Unknown"
        };
      } catch {
        return null;
      }
    })).then(results => results.filter(Boolean));
  }
}
export default async function handler(req, res) {
  const {
    action = "search",
      query = "cars",
      url
  } = req.method === "GET" ? req.query : req.body;
  const uhdPaper = new UhdPaper();
  if (action !== "search" && action !== "download" || action === "search" && !query || action === "download" && !url) {
    return res.status(400).json({
      result: [],
      message: "Invalid action or missing parameters"
    });
  }
  try {
    const results = action === "search" ? await uhdPaper.search(query) : await uhdPaper.download(url);
    return res.status(200).json({
      result: results.length ? results : []
    });
  } catch (err) {
    return res.status(500).json({
      result: [],
      message: err.message || "Unexpected error occurred"
    });
  }
}