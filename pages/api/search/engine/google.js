import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class GoogleSearch {
  constructor() {
    this.baseURL = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8`;
    this.googleURL = "https://www.google.com/search";
  }
  async getHtml(url) {
    try {
      const response = await axios.get(`${this.baseURL}?url=${encodeURIComponent(url)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil HTML: ${error.message}`);
    }
  }
  async search({
    query,
    page = 0
  }) {
    try {
      const searchUrl = `${this.googleURL}?q=${encodeURIComponent(query)}&start=${page * 10}`;
      const html = await this.getHtml(searchUrl);
      const $ = cheerio.load(html);
      const title = $('div[data-attrid="title"][role="heading"]').text().trim();
      const type = $('div[data-attrid="subtitle"][role="heading"]').text().trim();
      const description = $("div.wDYxhc:not(.NFQFxe), div.wDYxhc.NFQFxe .V8fWH").map((_, el) => {
        const $el = $(el);
        $el.find(".SW5pqf, h3").remove();
        return $el.text().trim() || null;
      }).get().filter(Boolean).join("\n");
      const related = $(".related-question-pair span.CSkcDe").map((_, el) => $(el).text().trim()).get().filter(Boolean);
      const searchResults = $(".tF2Cxc").map((_, el) => {
        const $el = $(el);
        return {
          title: $el.find("h3").text().trim(),
          url: $el.find("a").attr("href"),
          description: $el.find(".VwiC3b.yXK7lf.p4wth.r025kc.hJNv6b.Hdw6tb").text().trim()
        };
      }).get();
      return {
        title: title,
        type: type,
        description: description,
        related: related,
        searchResults: searchResults
      };
    } catch (error) {
      throw new Error(`Gagal mengambil hasil pencarian: ${error.message}`);
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
  const google = new GoogleSearch();
  try {
    const data = await google.search(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}