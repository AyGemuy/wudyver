import * as cheerio from "cheerio";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class Sokuja {
  async latest() {
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent("https://x1.sokuja.uk"));
    const $ = cheerio.load(data);
    return $(".seventh").map((_, el) => ({
      title: $(el).find(".main-seven a").attr("title") || "N/A",
      type: $(el).find(".main-seven .limit .bt .type").text() || "Unknown",
      thumbnail: $(el).find(".main-seven .limit img").attr("src") || "N/A",
      episode: $(el).find(".main-seven .limit .epin").text() || "N/A",
      url: $(el).find(".main-seven a").attr("href") || "#"
    })).get();
  }
  async search(q) {
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent(`https://x1.sokuja.uk?s=${encodeURIComponent(q)}`));
    const $ = cheerio.load(data);
    return $(".listupd .bs .bsx").map((_, el) => ({
      title: $(el).find("a").attr("title") || "N/A",
      type: $(el).find("a .limit .typez").text() || "Unknown",
      thumbnail: $(el).find("a .limit img").attr("src") || "N/A",
      status: $(el).find("a .limit .status").text() || "N/A",
      url: $(el).find("a").attr("href") || "#"
    })).get();
  }
  async detail(url) {
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent(url));
    const $ = cheerio.load(data);
    const metadata = {};
    const episode = [];
    $(".infox").each((_, el) => {
      metadata.title = $(el).find("h1").text() || "N/A";
      $(el).find(".info-content .spe span").each((_, em) => {
        const name = $(em).find("span b").text();
        const key = $(em).text().replace(name, "").trim();
        metadata[name.toLowerCase().split(":")[0].split(" ").join("_")] = key || "N/A";
      });
      metadata.thumbnail = $(".thumb img").attr("src") || "N/A";
      metadata.sinopsis = $(".entry-content p").eq(1).text().trim() || "N/A";
    });
    $(".eplister ul li").each((_, el) => {
      episode.push({
        title: $(el).find(".epl-title").text() || "N/A",
        release: $(el).find(".epl-date").text() || "Unknown",
        url: $(el).find("a").attr("href") || "#"
      });
    });
    return {
      metadata: metadata,
      episode: episode
    };
  }
  async episode(url) {
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent(url));
    const $ = cheerio.load(data);
    const metadata = {
      title: $(".title-section h1").text() || "N/A",
      thumbnail: $(".tb img").attr("src") || "N/A",
      updated: $(".lm .updated").text() || "Unknown"
    };
    const downloads = {};
    $(".mirror option").each((_, el) => {
      const base64Decoded = Buffer.from($(el).attr("value") || "", "base64").toString("utf-8");
      const $decoded = cheerio.load(base64Decoded);
      const mimetype = $decoded("source").attr("type") || "N/A";
      const quality = $(el).text().trim().split(" ")[1] || "Unknown";
      const fileUrl = $decoded("source").attr("src") || "#";
      if (fileUrl) downloads[quality] = {
        quality: quality,
        mimetype: mimetype,
        url: fileUrl
      };
    });
    return {
      metadata: metadata,
      downloads: downloads
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const sokuja = new Sokuja();
  try {
    let result;
    if (!action) {
      return res.status(400).json({
        error: "Action is required"
      });
    }
    switch (action) {
      case "latest":
        result = await sokuja.latest();
        break;
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required"
        });
        result = await sokuja.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required"
        });
        result = await sokuja.detail(url);
        break;
      case "episode":
        if (!url) return res.status(400).json({
          error: "URL is required"
        });
        result = await sokuja.episode(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}