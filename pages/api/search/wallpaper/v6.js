import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required"
    });
  }
  try {
    const response = await axios.get(`https://www.shutterstock.com/search/${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
      }
    });
    const $ = cheerio.load(response.data);
    const results = [...new Set([...$.html().matchAll(/https?:\/\/(image|www)\.shutterstock\.com\/([^"]+)/gim)].map(match => match[0]).filter(url => /\.(jpe?g|png)$/gi.test(url)))];
    return res.status(200).json({
      result: results
    });
  } catch (error) {
    console.error("Failed to fetch wallpapers:", error.message);
    res.status(500).json({
      error: "Failed to fetch wallpapers"
    });
  }
}