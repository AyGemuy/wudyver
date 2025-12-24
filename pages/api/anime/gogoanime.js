import axios from "axios";
import * as cheerio from "cheerio";
class Gogoanime {
  constructor({
    base_url
  } = {}) {
    this.base_url = base_url || "https://gogoanime.fi/";
  }
  async getFromLink(link) {
    if (!link) throw new Error("Missing Paramenter: link is not provided.");
    let htmlContent = await axios({
      url: link
    });
    let $ = cheerio.load(htmlContent.data);
    const episodeCount = $("ul#episode_page li a.active").attr("ep_end");
    let download = $("li.dowloads a").attr("href");
    if (!download) throw new Error("Scraping Error: Unable to scrap the download link");
    htmlContent = await axios({
      url: download
    });
    $ = cheerio.load(htmlContent.data);
    const ScrapedAnime = {
      name: $("span#title").text() || null,
      download: [],
      extraLink: []
    };
    $("div.dowload").each(function(i, elem) {
      let qualityObject = {};
      $ = cheerio.load($(this).html());
      qualityObject.quality = $("a").text().replace("Download\n", "").trim();
      qualityObject.link = $("a").attr("href");
      if (qualityObject.quality.startsWith("(")) ScrapedAnime.download.push(qualityObject);
      else ScrapedAnime.extraLink.push(qualityObject);
    });
    return ScrapedAnime;
  }
  async search(name, {
    page = "1"
  } = {}) {
    if (!name) throw new Error("Missing Paramenter: anime name is not provided.");
    const BaseURL = this.base_url;
    const htmlContent = await axios({
      url: `${BaseURL}/search.html?keyword=${encodeURIComponent(name)}&page=${page}`
    });
    let $ = cheerio.load(htmlContent.data);
    const searchResults = [];
    $("ul.items li").each(function(i, elem) {
      let anime = {};
      $ = cheerio.load($(elem).html());
      anime.title = $("p.name a").text() || null;
      anime.img = $("div.img a img").attr("src") || null;
      anime.link = $("div.img a").attr("href") || null;
      anime.releaseDate = $("p.released").text().trim() || null;
      if (anime.link) anime.link = BaseURL + anime.link;
      searchResults.push(anime);
    });
    return searchResults;
  }
  async getEpisodes(name, episode) {
    if (!name) throw new Error("Missing Paramenters: anime name is not provided.");
    if (!episode) throw new Error("Missing Paramenters: anime episode number is not provided");
    const Episode = await this.getFromLink(`${this.base_url}/${name}-episode-${episode}`).catch(err => {});
    return Episode ? Episode : {};
  }
  async fetchAnime(link) {
    if (!link) throw new Error("Missing Paramenter: anime link is not provided.");
    const htmlContent = await axios({
      url: link
    });
    const $ = cheerio.load(htmlContent.data);
    let animeData = {
      name: $("div.anime_info_body_bg h1").text() || null,
      image: $("div.anime_info_body_bg img").attr("src"),
      episodeCount: $("ul#episode_page li a.active").attr("ep_end"),
      slug: link.split("/category/")[1]
    };
    $("div.anime_info_body_bg p.type").each(function(i, elem) {
      const $x = cheerio.load($(elem).html());
      let keyName = $x("span").text().toLowerCase().replace(":", "").trim().replace(/ /g, "_");
      if (/plot_summary|released|other_name/g.test(keyName)) animeData[keyName] = $(elem).html().replace(`<span>${$x("span").text()}</span>`, "");
      else animeData[keyName] = $x("a").text().trim() || null;
    });
    return animeData;
  }
  async getRecentAnime() {
    const BaseURL = this.base_url;
    const htmlContent = await axios({
      url: BaseURL
    });
    let $ = cheerio.load(htmlContent.data);
    const recentAnime = [];
    $("ul.items li").each(function(i, elem) {
      $ = cheerio.load($(elem).html());
      const anime = {
        title: $("p.name a").text() || null,
        episode: $("p.episode").text() || null,
        image: $("div.img img").attr("src") || null,
        link: BaseURL + $("div.img a").attr("href")
      };
      recentAnime.push(anime);
    });
    return recentAnime;
  }
  async getPopularAnime() {
    const BaseURL = this.base_url;
    const htmlContent = await axios({
      url: `${BaseURL}/popular.html`
    });
    let $ = cheerio.load(htmlContent.data);
    const popularAnime = [];
    $("ul.items li").each(function(i, elem) {
      $ = cheerio.load($(elem).html());
      const anime = {
        title: $("p.name a").text() || null,
        episode: $("p.episode").text() || null,
        image: $("div.img img").attr("src") || null,
        link: BaseURL + $("div.img a").attr("href")
      };
      popularAnime.push(anime);
    });
    return popularAnime;
  }
}
export default async function handler(req, res) {
  const gogoanime = new Gogoanime({});
  try {
    if (req.query.action === "search") {
      const result = await gogoanime.search(req.query.name, {
        page: req.query.page
      });
      return res.status(200).json(result);
    }
    if (req.query.action === "getEpisodes") {
      const result = await gogoanime.getEpisodes(req.query.name, req.query.episode);
      return res.status(200).json(result);
    }
    if (req.query.action === "getPopular") {
      const result = await gogoanime.getPopularAnime();
      return res.status(200).json(result);
    }
    if (req.query.action === "getRecent") {
      const result = await gogoanime.getRecentAnime();
      return res.status(200).json(result);
    }
    return res.status(400).json({
      error: "Invalid action"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}