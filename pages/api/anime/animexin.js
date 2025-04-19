import axios from "axios";
import * as cheerio from "cheerio";
class AnimeXIn {
  async update() {
    try {
      const {
        data
      } = await axios.get("https://animexin.dev/");
      const $ = cheerio.load(data);
      const animeList = [];
      $(".listupd .bsx").each((index, element) => {
        const title = $(element).find('h2[itemprop="headline"]').text();
        const url = $(element).find('a[itemprop="url"]').attr("href");
        const image = $(element).find('img[itemprop="image"]').attr("src");
        const episode = $(element).find(".eggepisode").text();
        const type = $(element).find(".eggtype").text();
        animeList.push({
          title: title,
          url: url,
          image: image,
          episode: episode,
          type: type
        });
      });
      return animeList;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const episodeData = {
        title: $('h2[itemprop="partOfSeries"]').text(),
        episodeTitle: $('h2[itemprop="headline"]').text(),
        image: $('.thumb img[itemprop="image"]').attr("src"),
        rating: $(".rating strong").text(),
        status: $('.spe span:contains("Status:")').text().replace("Status: ", ""),
        network: $('.spe span:contains("Network:") a').text(),
        studio: $('.spe span:contains("Studio:") a').text(),
        released: $('.spe span:contains("Released:")').text().replace("Released: ", ""),
        duration: $('.spe span:contains("Duration:")').text().replace("Duration: ", ""),
        country: $('.spe span:contains("Country:") a').text(),
        type: $('.spe span:contains("Type:")').text().replace("Type: ", ""),
        episodes: $('.spe span:contains("Episodes:")').text().replace("Episodes: ", ""),
        fansub: $('.spe span:contains("Fansub:")').text().replace("Fansub: ", ""),
        genres: $(".genxed a").map((i, el) => $(el).text()).get(),
        description: $(".desc.mindes").text().trim(),
        downloadLinks: []
      };
      $(".mctnx .soraddlx").each((index, element) => {
        const subtitleType = $(element).find(".sorattlx h3").text();
        const links = $(element).find(".soraurlx a").map((i, el) => ({
          url: $(el).attr("href")
        })).get();
        episodeData.downloadLinks.push({
          subtitleType: subtitleType,
          links: links
        });
      });
      return episodeData;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async search(keyword) {
    try {
      const {
        data
      } = await axios.get(`https://animexin.dev/?s=${encodeURIComponent(keyword)}`);
      const $ = cheerio.load(data);
      const animeList = [];
      $(".listupd article.bs").each((index, element) => {
        const title = $(element).find('h2[itemprop="headline"]').text();
        const url = $(element).find('a[itemprop="url"]').attr("href");
        const image = $(element).find('img[itemprop="image"]').attr("src");
        const status = $(element).find(".epx").text();
        const subtitle = $(element).find(".sb").text();
        const type = $(element).find(".typez").text();
        animeList.push({
          title: title,
          url: url,
          image: image,
          status: status,
          subtitle: subtitle,
          type: type
        });
      });
      return animeList;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    keyword,
    url
  } = req.method === "GET" ? req.query : req.body;
  const animeXIn = new AnimeXIn();
  try {
    let result;
    switch (action) {
      case "search":
        if (!keyword) {
          return res.status(400).json({
            error: "Keyword is required for search"
          });
        }
        result = await animeXIn.search(keyword);
        break;
      case "detail":
        if (!url) {
          return res.status(400).json({
            error: "URL is required for detail"
          });
        }
        result = await animeXIn.detail(url);
        break;
      case "update":
        result = await animeXIn.update();
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}