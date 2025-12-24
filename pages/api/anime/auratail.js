import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class Auratail {
  async popular() {
    const url = "https://auratail.vip";
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent(url));
    const $ = cheerio.load(data);
    const popularSection = $("div.listupd.normal").first();
    const results = [];
    popularSection.find("article.bs").each((_, el) => {
      const title = $(el).find("div.tt h2").text().trim();
      const episodeLink = $(el).find("a").attr("href").trim();
      results.push({
        title: title,
        link: episodeLink
      });
    });
    return results;
  }
  async latest() {
    const url = "https://auratail.vip/anime/?status=&type=&order=update";
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent(url));
    const $ = cheerio.load(data);
    const latestReleases = [];
    $(".listupd .bsx").each((_, el) => {
      const title = $(el).find(".tt h2").text().trim();
      const episode = $(el).find(".bt .epx").text().trim();
      const link = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
      latestReleases.push({
        title: title,
        episode: episode,
        link: link,
        image: image
      });
    });
    return latestReleases;
  }
  async detail(url) {
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent(url));
    const $ = cheerio.load(data);
    const title = $('.entry-title[itemprop="name"]').text().trim();
    const image = $('.thumb img[itemprop="image"]').attr("data-src") || $('.thumb img[itemprop="image"]').attr("src");
    const status = $('span:contains("Status:")').text().replace("Status:", "").trim();
    const studio = $('span:contains("Studio:")').text().replace("Studio:", "").trim();
    const episodes = $('span:contains("Episodes:")').text().replace("Episodes:", "").trim();
    const duration = $('span:contains("Duration:")').text().replace("Duration:", "").trim();
    const type = $('span:contains("Type:")').text().replace("Type:", "").trim();
    const releaseYear = $('span:contains("Released:")').text().replace("Released:", "").trim();
    const producers = $('span:contains("Producers:")').nextUntil("span").map((_, el) => $(el).text().trim()).get().join(", ");
    const genres = $(".genxed a").map((_, el) => $(el).text().trim()).get().join(", ");
    const synopsis = $('.entry-content[itemprop="description"] p').map((_, el) => $(el).text().trim()).get().join("\n");
    return {
      title: title,
      image: image,
      status: status,
      studio: studio,
      episodes: episodes,
      duration: duration,
      type: type,
      releaseYear: releaseYear,
      producers: producers,
      genres: genres,
      synopsis: synopsis
    };
  }
  async search(query) {
    const url = `https://auratail.vip/?s=${encodeURIComponent(query)}`;
    const {
      data
    } = await axios.get(randomProxyUrl + encodeURIComponent(url));
    const $ = cheerio.load(data);
    const searchResults = [];
    $("#content .listupd article").each((_, el) => {
      const title = $(el).find(".tt h2").text().trim();
      const link = $(el).find("a").attr("href");
      const image = $(el).find(".lazyload").attr("data-src") || $(el).find("noscript img").attr("src");
      const status = $(el).find(".status").text().trim() || $(el).find(".bt .epx").text().trim();
      searchResults.push({
        title: title,
        link: link,
        image: image,
        status: status
      });
    });
    return searchResults;
  }
}
export default async function handler(req, res) {
  const action = req.query.action;
  const auratail = new Auratail();
  try {
    let result;
    if (action === "popular") {
      result = await auratail.popular();
    } else if (action === "latest") {
      result = await auratail.latest();
    } else if (action === "detail" && req.query.url) {
      result = await auratail.detail(req.query.url);
    } else if (action === "search" && req.query.query) {
      result = await auratail.search(req.query.query);
    } else {
      return res.status(400).json({
        error: "Invalid action or missing parameters"
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}