import axios from "axios";
import * as cheerio from "cheerio";
class Zonafilm {
  async detail(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const image = $(".gmr-movie-data img").attr("src");
      const title = $(".gmr-movie-data h1.entry-title").text();
      const ratingValue = $(".gmr-meta-rating span[itemprop='ratingValue']").text();
      const ratingCount = $(".gmr-meta-rating span[itemprop='ratingCount']").text();
      const description = $(".entry-content.entry-content-single p").first().text().trim();
      const synopsis = $(".entry-content.entry-content-single p").eq(1).text().trim();
      const downloadLinks = [];
      $(".well p").each((_, el) => {
        const resolution = $(el).find("b").text().replace(":", "").trim();
        const links = [];
        $(el).find("a").each((_, link) => {
          links.push({
            text: $(link).text(),
            url: $(link).attr("href")
          });
        });
        downloadLinks.push({
          resolution: resolution,
          links: links
        });
      });
      const episodes = [];
      $("div[style*='text-align: center; background: white;']").each((_, el) => {
        const episodeBlock = $(el);
        episodeBlock.find("p").each((_, p) => {
          const episodeTitle = $(p).find("strong").text().trim();
          if (episodeTitle.toLowerCase().includes("episode")) {
            let episodeData = episodes.find(ep => ep.episode === episodeTitle);
            if (!episodeData) {
              episodeData = {
                episode: episodeTitle,
                resolutions: []
              };
              episodes.push(episodeData);
            }
            let currentP = $(p).next();
            while (currentP.length > 0 && !currentP.find("strong").text().trim().toLowerCase().includes("episode")) {
              const resolution = currentP.find("strong").text().trim();
              if (resolution.match(/^\d{3,4}p$/)) {
                const links = [];
                currentP.find("a").each((_, link) => {
                  links.push({
                    text: $(link).text().trim(),
                    url: $(link).attr("href")
                  });
                });
                episodeData.resolutions.push({
                  resolution: resolution,
                  links: links
                });
              }
              currentP = currentP.next();
            }
          }
        });
      });
      const details = {};
      $(".content-moviedata .gmr-moviedata").each((_, el) => {
        const key = $(el).find("strong").text().replace(":", "").trim();
        const value = $(el).text().replace(`${key}:`, "").trim();
        details[key.toLowerCase()] = value;
      });
      return JSON.stringify({
        title: title,
        image: image,
        rating: {
          value: ratingValue,
          count: ratingCount
        },
        description: description,
        synopsis: synopsis,
        downloadLinks: downloadLinks,
        episodes: episodes,
        details: details
      }, null, 2);
    } catch (error) {
      return error.message;
    }
  }
  async search(kata) {
    try {
      const response = await axios.get("https://zonafilm.fit/?s=" + kata);
      const $ = cheerio.load(response.data);
      const results = [];
      $("article.item").each((index, element) => {
        const title = $(element).find(".entry-title a").text();
        const url = $(element).find(".entry-title a").attr("href");
        const image = $(element).find(".content-thumbnail img").attr("src");
        const rating = $(element).find(".gmr-rating-item").text().trim();
        const duration = $(element).find(".gmr-duration-item").text().trim();
        const categories = $(element).find(".gmr-movie-on a").map((i, el) => $(el).text()).get();
        const country = $(element).find('.gmr-movie-on span[itemprop="contentLocation"] a').map((i, el) => $(el).text()).get();
        const dateCreated = $(element).find('time[itemprop="dateCreated"]').attr("datetime");
        results.push({
          title: title,
          url: url,
          image: image,
          rating: rating,
          duration: duration,
          categories: categories,
          country: country,
          dateCreated: dateCreated
        });
      });
      return results;
    } catch (error) {
      return error.message;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action parameter is required"
    });
  }
  const zonafilm = new Zonafilm();
  try {
    switch (action) {
      case "detail":
        const {
          url
        } = params;
        if (!url) {
          return res.status(400).json({
            error: "URL parameter is required for detail"
          });
        }
        const movieDetails = await zonafilm.detail(url);
        return res.status(200).json(JSON.parse(movieDetails));
      case "search":
        const {
          query
        } = params;
        if (!query) {
          return res.status(400).json({
            error: "Query parameter is required for search"
          });
        }
        const searchResults = await zonafilm.search(query);
        return res.status(200).json(searchResults);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}