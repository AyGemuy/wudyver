import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class TeamSkeet {
  constructor() {
    this.baseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }
  async search(query = "Milf") {
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}https://www.teamskeet.com/search?filter=${encodedQuery}`;
    const result = await this.getJSON(url, "searchResults");
    const resultPage = result.items.pages[0];
    const updatedData = resultPage.map(item => ({
      ...item,
      video: `https://videodelivery.net/${item.videoSrc}/manifest/video.m3u8`,
      link: `https://tours-store.psmcdn.net/ts-elastic-alias-videoscontent/_doc/${item.id}`
    }));
    return updatedData || [];
  }
  async detail(url) {
    const encodedUrl = encodeURIComponent(url);
    const result = await this.getJSON(`${this.baseUrl}${encodedUrl}`, "videosContent");
    const updatedData = result.map(item => ({
      ...item,
      video: `https://videodelivery.net/${item.videoSrc}/manifest/video.m3u8`,
      link: `https://tours-store.psmcdn.net/ts-elastic-alias-videoscontent/_doc/${item.id}`
    }));
    return updatedData || [];
  }
  async getJSON(url, key) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const scriptContent = $("script").toArray().map(el => $(el).html()).find(content => content.includes(key));
      if (scriptContent) {
        const parsedData = this.parseString(scriptContent)?.parsedData;
        return this.findKey(parsedData, key) || null;
      }
      console.log("Data tidak ditemukan.");
      return null;
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  }
  parseString(input) {
    const startIndex = input.indexOf("{");
    const endIndex = input.lastIndexOf("}");
    if (startIndex !== -1 && endIndex > startIndex) {
      const jsonString = input.slice(startIndex, endIndex + 1);
      try {
        return {
          parsedData: JSON.parse(jsonString)
        };
      } catch {
        console.error("Error parsing JSON.");
      }
    }
    return null;
  }
  findKey(obj, key) {
    if (key in obj) return obj[key];
    for (const k in obj) {
      if (typeof obj[k] === "object") {
        const found = this.findKey(obj[k], key);
        if (found) return found;
      }
    }
    return null;
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new TeamSkeet();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await downloader.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await downloader.detail(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}