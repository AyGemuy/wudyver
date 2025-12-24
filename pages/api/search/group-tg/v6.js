import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookieJarSupport
} from "axios-cookiejar-support";
class TgramScraper {
  constructor(config = {}) {
    const jar = new CookieJar();
    this.client = axiosCookieJarSupport(axios.create({
      jar: jar,
      baseURL: "https://tgram.io",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      },
      ...config
    }));
  }
  async detail({
    url
  }) {
    if (!url) throw new Error("Paramenter `url` wajib diisi.");
    try {
      const {
        data
      } = await this.client.get(url);
      const $ = cheerio.load(data);
      const title = $("h1.h4").text()?.trim() || null;
      const name = title ? title.replace("Telegram Group: ", "") : null;
      const dl = $("dl.row");
      const membersText = dl.find('dt:contains("Members")').next("dd").text()?.trim() || "";
      const membersMatch = membersText.match(/(\d[\d,.]*)/);
      const members = membersMatch ? parseInt(membersMatch[1].replace(/,/g, ""), 10) : 0;
      return {
        name: name,
        username: dl.find('dt:contains("Username")').next("dd").find("a").text()?.trim() || null,
        members: members,
        chat_language: dl.find('dt:contains("Language")').next("dd").text()?.trim() || null,
        topics: dl.find('dt:contains("Topic")').next("dd").text()?.trim() || null,
        description: $(".text-muted2").text()?.trim() || null,
        image: `https://tgram.io${$(".col-3.col-md-2 img").attr("src") || ""}`,
        join_link: $("a.btn-outline-danger").attr("href") || null
      };
    } catch (error) {
      console.error(`Error saat mengambil detail untuk URL ${url}:`, error.message);
      return null;
    }
  }
  async search({
    query,
    limit = 5,
    detail = true,
    ...rest
  }) {
    if (!query) throw new Error("Paramenter `query` wajib diisi.");
    try {
      const {
        data
      } = await this.client.get("/search", {
        params: {
          query: query,
          lang: rest.lang || ""
        }
      });
      const $ = cheerio.load(data);
      const initialResults = $(".col-12.col-sm-6.col-md-4").map((i, el) => {
        const card = $(el);
        const name = card.find("h3.h6 a").text()?.trim() || "No Name";
        const link = `https://tgram.io${card.find("h3.h6 a").attr("href") || ""}`;
        return {
          name: name,
          link: link,
          username: card.find(".text-success.small2").text()?.trim() || null,
          image: `https://tgram.io${card.find("img.d-flex.mr-3").attr("src") || ""}`,
          description: card.find(".text-muted.small").text()?.trim() || "No Description"
        };
      }).get().slice(0, limit);
      if (detail) {
        const finalResults = [];
        for (const item of initialResults) {
          const detailedInfo = await this.detail({
            url: item.link
          });
          finalResults.push(detailedInfo ? {
            ...item,
            ...detailedInfo
          } : item);
        }
        return {
          success: true,
          query: query,
          limit: limit,
          count: finalResults.length,
          results: finalResults
        };
      }
      return {
        success: true,
        query: query,
        limit: limit,
        count: initialResults.length,
        results: initialResults
      };
    } catch (error) {
      console.error("Error saat melakukan pencarian:", error.message);
      return null;
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
  const scraper = new TgramScraper();
  try {
    const search_response = await scraper.search(params);
    return res.status(200).json(search_response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}