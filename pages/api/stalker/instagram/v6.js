import axios from "axios";
import * as cheerio from "cheerio";
class SocialStatsFetcher {
  constructor(query) {
    this.url = `https://socialstats.info/report/${query}/instagram`;
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      Referer: "https://socialstats.info/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async fetchData() {
    try {
      const {
        data
      } = await axios.get(this.url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      return {
        username: $(".text-dark").text().trim() || null,
        fullName: $("h1").text().trim() || null,
        profileImage: $(".instagram-avatar").attr("src") || null,
        bio: $("small.text-muted").first().text().trim() || null,
        followers: $(".report-header-number").eq(0).text().trim() || null,
        uploads: $(".report-header-number").eq(1).text().trim() || null,
        engagement: $(".report-header-number").eq(2).text().trim() || null,
        isVerified: $(".user-verified-badge").length ? true : false
      };
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      message: "query is required."
    });
  }
  const fetcher = new SocialStatsFetcher(query);
  try {
    const result = await fetcher.fetchData();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error.message
    });
  }
}