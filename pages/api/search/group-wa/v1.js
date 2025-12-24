import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class GroupScraper {
  constructor() {
    this.baseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=`;
  }
  async fetchPage(url) {
    try {
      const {
        data
      } = await axios.get(url);
      return cheerio.load(data);
    } catch (error) {
      console.error("Error fetching page:", error.message);
      return null;
    }
  }
  async search({
    query,
    limit = 5
  }) {
    const $ = await this.fetchPage(`${this.baseUrl}https://wagroupjoin.com/?s=${encodeURIComponent(query)}`);
    if (!$) return [];
    const results = $("#archive-container .entry").map((_, el) => ({
      title: $(el).find(".entry-title a").text() || "No Title",
      url: $(el).find(".entry-title a").attr("href") || "#"
    })).get().slice(0, limit);
    try {
      const infoResults = await Promise.all(results.map(result => this.info(result.url)));
      return results.map((result, index) => ({
        ...result,
        ...infoResults[index]
      }));
    } catch (error) {
      console.error("Error during info fetching:", error.message);
      return results;
    }
  }
  async info(url) {
    const $ = await this.fetchPage(`${this.baseUrl}${url}`);
    if (!$) return null;
    try {
      const title = $(".entry-title").text() || "No Title";
      const whatsapp = $(".wp-block-kadence-advancedbtn a").attr("href") || "#";
      const group = $(".wp-block-table tbody tr").map((_, el) => ({
        title: $(el).find("td").eq(0).text().trim() || "No Group Name",
        url: $(el).find("td").eq(1).find("a").attr("href") || "#"
      })).get();
      return {
        title: title,
        whatsapp: whatsapp,
        group: group
      };
    } catch (error) {
      console.error("Error parsing info:", error.message);
      return {
        title: "No Title",
        whatsapp: "#",
        group: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const api = new GroupScraper();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}