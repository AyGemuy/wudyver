import axios from "axios";
import * as cheerio from "cheerio";
class HttpRequest {
  constructor() {
    this.cookies = "";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query
  }) {
    try {
      const url = `https://sfile.mobi/search.php?q=${encodeURIComponent(query)}&search=Search`;
      const response = await axios.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      $(".list").each((i, el) => {
        const name = $(el).find("a").text().trim();
        const link = $(el).find("a").attr("href");
        const size = $(el).text().split("(")[1]?.split(")")[0]?.trim() || "Unknown";
        if (name && link) {
          results.push({
            name: name,
            link: link,
            size: size
          });
        }
      });
      return results;
    } catch (error) {
      console.error("Error fetching search results:", error);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query is required"
    });
  }
  const httpRequest = new HttpRequest();
  try {
    const data = await httpRequest.search(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during request"
    });
  }
}