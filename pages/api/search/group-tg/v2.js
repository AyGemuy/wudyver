import axios from "axios";
import * as cheerio from "cheerio";
class TeletegScraper {
  constructor() {
    this.base_url = "https://teleteg.com";
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async search({
    query,
    limit = 5
  }) {
    try {
      const response = await axios.get(`${this.base_url}/search-results/`, {
        params: {
          query: query,
          filters: "groups"
        },
        headers: {
          ...this.headers,
          Referer: `${this.base_url}/`,
          Cookie: "django_language=en"
        }
      });
      const $ = cheerio.load(response.data);
      const results = $("table.table-sm tbody tr:has(th[scope='row'])").slice(0, limit).get().map((el, index) => {
        const $row = $(el);
        const columns = $row.find("td");
        const link = columns.eq(0).find("a").attr("href") || "";
        const title = columns.eq(1).find("p").text().trim() || "";
        const description = columns.eq(2).find("p").text().trim() || "";
        const members = parseInt(columns.eq(3).text().trim()) || 0;
        const rating = parseFloat(columns.eq(4).text().trim()) || 0;
        const msgQlt = parseFloat(columns.eq(5).text().trim()) || 0;
        const online = parseFloat(columns.eq(6).text().trim()) || 0;
        const createdText = columns.eq(7).text().trim();
        const created = createdText === "none" ? "" : createdText;
        const permissions = {
          canSendMessages: columns.eq(8).find(".bg-succesS-soft").length > 0,
          canSendMedia: columns.eq(9).find(".bg-succesS-soft").length > 0,
          canSendPolls: columns.eq(10).find(".bg-succesS-soft").length > 0,
          canInviteUsers: columns.eq(11).find(".bg-succesS-soft").length > 0
        };
        return {
          rank: index + 1,
          link: link,
          title: title,
          description: description,
          members: members,
          rating: rating,
          msgQlt: msgQlt,
          online: online,
          created: created,
          permissions: permissions
        };
      });
      return {
        success: true,
        query: query,
        limit: limit,
        count: results.length,
        results: results
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: error.message || "Internal Server Error",
        query: query,
        limit: limit,
        count: 0,
        results: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required."
    });
  }
  const teletegScraper = new TeletegScraper();
  try {
    const search_response = await teletegScraper.search(params);
    return res.status(200).json(search_response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}