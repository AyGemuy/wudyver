import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class UsagiPoiScraper {
  constructor() {
    this.proxy_url = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v2?url=`;
  }
  async search({
    query = ""
  } = {}) {
    try {
      const target_url = `https://usagipoi.com/?s=${encodeURIComponent(query)}`;
      const api_url = `${this.proxy_url}${encodeURIComponent(target_url)}`;
      const response = await axios.get(api_url);
      const $ = cheerio.load(response.data);
      return $(".listupd article.bsz").map((_i, el) => {
        const link_el = $(el).find(".bsx a");
        const title = link_el.attr("title") || "No Title";
        const item_url = link_el.attr("href") || "#";
        const image = link_el.find(".limit img").attr("src") || "no_image.jpg";
        const info_text = link_el.find(".tt span").text().trim();
        const [type = "Unknown", status = "Unknown", year = "N/A"] = info_text.split(" · ").map(s => s.trim());
        return {
          title: title,
          url: item_url,
          image: image,
          type: type,
          status: status,
          year: year
        };
      }).get();
    } catch (error) {
      console.error(`Error in search: ${error.message}`);
      return [];
    }
  }
  async detail({
    url = ""
  } = {}) {
    try {
      const api_url = `${this.proxy_url}${encodeURIComponent(url)}`;
      const response = await axios.get(api_url);
      const $ = cheerio.load(response.data);
      const title = $(".entry-title").text().replace(" Subtitle Indonesia", "").trim() || "No Title";
      const description = $(".entry-content.serial-info p").text().trim() || "No description available.";
      const image = $(".entry-content.serial-info img").attr("src") || "no_image.jpg";
      const details = {};
      $("table tbody tr").each((_i, el) => {
        const key = $(el).find("th").text().replace(":", "").trim().toLowerCase().replace(/\s/g, "_");
        let value;
        if (key === "genre") {
          value = $(el).find("td.tags a").map((_j, em) => $(em).text().trim()).get();
        } else {
          value = $(el).find("td").text().trim();
        }
        details[key] = value || "N/A";
      });
      const episodes = $("#epall + ul.daftar li a.othereps").map((_i, el) => ({
        title: $(el).text().trim() || "No Title",
        url: $(el).attr("href") || "#"
      })).get();
      return {
        title: title,
        description: description,
        image: image,
        alternative: details.alternatif || "N/A",
        type: details.tipe || "N/A",
        episodes_count: details.episode || "N/A",
        genres: details.genre || [],
        status: details.status || "N/A",
        score: details.skor || "N/A",
        producer: details.produser || "N/A",
        year: details.tahun || "N/A",
        episodes: episodes
      };
    } catch (error) {
      console.error(`Error in detail: ${error.message}`);
      return null;
    }
  }
  async download({
    url = ""
  } = {}) {
    try {
      const api_url = `${this.proxy_url}${encodeURIComponent(url)}`;
      const response = await axios.get(api_url);
      const $ = cheerio.load(response.data);
      const player_iframe_src = $("#pembed iframe").attr("src") || "no_player.html";
      const download_links = $(".mirror option").map((_i, el) => {
        const player = $(el).text().trim() || "Unknown Player";
        const embed_code_base64 = $(el).attr("data-em");
        if (embed_code_base64) {
          return {
            player: player,
            embed_code: Buffer.from(embed_code_base64, "base64").toString("utf8")
          };
        }
        return null;
      }).get().filter(link => link !== null);
      return {
        player_iframe_src: player_iframe_src,
        download_links: download_links.length > 0 ? download_links : [{
          player: "No Links",
          embed_code: "N/A"
        }]
      };
    } catch (error) {
      console.error(`Error in download: ${error.message}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    const usagipoi_scraper = new UsagiPoiScraper();
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: 'Paramenter "query" is required for search action.'
          });
        }
        result = await usagipoi_scraper.search({
          query: query
        });
        break;
      case "detail":
        if (!url) {
          return res.status(400).json({
            error: 'Paramenter "url" is required for detail action.'
          });
        }
        result = await usagipoi_scraper.detail({
          url: url
        });
        break;
      case "download":
        if (!url) {
          return res.status(400).json({
            error: 'Paramenter "url" is required for download action.'
          });
        }
        result = await usagipoi_scraper.download({
          url: url
        });
        break;
      default:
        return res.status(400).json({
          error: "Invalid action specified. Supported actions are 'search', 'detail', and 'download'."
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}