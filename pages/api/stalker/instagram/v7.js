import axios from "axios";
import * as cheerio from "cheerio";
class InstagramAnalyzer {
  constructor(username) {
    this.username = username;
    this.url = `https://instaanalyzer.com/report/${username}/instagram`;
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=0, i",
      referer: "https://instaanalyzer.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchData() {
    try {
      const response = await axios.get(this.url, {
        headers: this.headers
      });
      return this.parseData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return null;
    }
  }
  parseData(html) {
    const $ = cheerio.load(html);
    const data = {};
    const profileInfo = $(".d-flex.flex-column.flex-sm-row.flex-wrap.margin-bottom-6");
    data.username = profileInfo.find(".col-sm-8 a.text-dark").text().trim();
    data.fullName = profileInfo.find(".col-sm-8 h1").text().trim();
    data.avatar = profileInfo.find("img.instagram-avatar").attr("src");
    data.description = profileInfo.find(".col-sm-8 small.text-muted").text().trim();
    const stats = $(".col-md-12.col-lg-4 .col");
    data.followers = stats.eq(0).find(".report-header-number").text().trim();
    data.uploads = stats.eq(1).find(".report-header-number").text().trim();
    data.engagement = stats.eq(2).find(".report-header-number").text().trim();
    const [engagementRate, averageLikes, averageComments] = $(".report-content-number").map((_, el) => $(el).text().trim()).get();
    data.engagementRate = engagementRate;
    data.averageLikes = averageLikes;
    data.averageComments = averageComments;
    data.futureProjections = this.getFutureProjections($);
    data.engagementRates = this.getEngagementRates($);
    data.mediaStats = this.getMediaStats($);
    return data;
  }
  getFutureProjections($) {
    return $("table tbody tr").map((_, el) => {
      const cells = $(el).find("td");
      return cells.length ? {
        timeUntil: cells.eq(0).text().trim(),
        date: cells.eq(1).text().trim(),
        followers: cells.eq(2).text().trim(),
        uploads: cells.eq(3).text().trim()
      } : null;
    }).get().filter(v => v.timeUntil);
  }
  getEngagementRates($) {
    return $(".margin-bottom-6 table tbody tr").map((_, el) => {
      const cells = $(el).find("td");
      return cells.length ? {
        followers: cells.eq(0).text().trim(),
        otherAverageEngagement: cells.eq(1).text().trim(),
        profileEngagement: cells.eq(2).text().trim()
      } : null;
    }).get().filter(v => v.followers);
  }
  getMediaStats($) {
    return $(".margin-bottom-6 table tbody tr").map((_, el) => {
      const cells = $(el).find("td");
      return cells.length ? {
        link: cells.eq(0).find("a").attr("href"),
        image: cells.eq(1).find("img").attr("src"),
        postedOn: cells.eq(2).text().trim(),
        caption: cells.eq(3).text().trim(),
        likes: cells.eq(4).text().trim(),
        comments: cells.eq(5).text().trim()
      } : null;
    }).get().filter(v => v.link);
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
  const fetcher = new InstagramAnalyzer(query);
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