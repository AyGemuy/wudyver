import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: 'Query parameter "url" is required.'
    });
  }
  try {
    const {
      data: api
    } = await axios.get("https://downloader.run");
    const token = cheerio.load(api)("#token").val();
    const {
      data
    } = await axios.post("https://downloader.run/wp-json/aio-dl/video-data/", new URLSearchParams({
      url: url,
      token: token
    }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Postify/1.0.0"
      }
    });
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
}