import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    query: q
  } = req.method === "GET" ? req.query : req.body;
  if (!q) {
    return res.status(400).json({
      error: "Paramenter 'query' is required"
    });
  }
  try {
    const response = await axios.get(`https://storyset.com/search?q=${encodeURIComponent(q)}`);
    const $ = cheerio.load(response.data);
    const thumbnailUrls = $('script[type="application/ld+json"]').toArray().map(element => {
      try {
        const jsonData = JSON.parse($(element).html());
        if (jsonData["@type"] === "ImageObject" && jsonData.thumbnailUrl) {
          return jsonData.thumbnailUrl;
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    }).filter(url => url);
    return res.status(200).json({
      result: thumbnailUrls
    });
  } catch (error) {
    console.error("Failed to fetch data from Storyset:", error.message);
    res.status(500).json({
      error: "Failed to fetch data from Storyset"
    });
  }
}