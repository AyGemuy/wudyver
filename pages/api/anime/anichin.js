import axios from "axios";
import * as cheerio from "cheerio";
class AnichinScraper {
  async latest() {
    const url = "https://anichin.date/";
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const results = [];
      $(".listupd.normal .bs").each((_, element) => {
        const linkElement = $(element).find("a");
        const title = linkElement.attr("title");
        const url = linkElement.attr("href");
        const episode = $(element).find(".bt .epx").text().trim();
        const thumbnail = $(element).find("img").attr("src");
        const type = $(element).find(".typez").text().trim();
        results.push({
          title: title,
          url: url,
          episode: episode,
          thumbnail: thumbnail,
          type: type
        });
      });
      return results;
    } catch (error) {
      throw new Error("Error fetching latest: " + error.message);
    }
  }
  async episode(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const episodes = [];
      $(".eplister ul li").each((_, element) => {
        const episodeNumber = $(element).find(".epl-num").text().trim();
        const title = $(element).find(".epl-title").text().trim();
        const subStatus = $(element).find(".epl-sub .status").text().trim();
        const releaseDate = $(element).find(".epl-date").text().trim();
        const link = $(element).find("a").attr("href");
        episodes.push({
          episodeNumber: episodeNumber,
          title: title,
          subStatus: subStatus,
          releaseDate: releaseDate,
          link: link
        });
      });
      return episodes;
    } catch (error) {
      throw new Error("Error fetching episodes: " + error.message);
    }
  }
  async download(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const downloads = [];
      $(".mctnx .soraddlx").each((_, element) => {
        const resolution = $(element).find(".soraurlx strong").first().text().trim();
        const links = [];
        $(element).find(".soraurlx a").each((_, linkElement) => {
          const host = $(linkElement).text().trim();
          const link = $(linkElement).attr("href");
          links.push({
            host: host,
            link: link
          });
        });
        downloads.push({
          resolution: resolution,
          links: links
        });
      });
      return downloads;
    } catch (error) {
      throw new Error("Error fetching download links: " + error.message);
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const title = $(".entry-title").text().trim();
      const thumbnail = $(".thumb img").attr("src");
      const rating = $(".rating strong").text().replace("Rating ", "").trim();
      const followers = $(".bmc").text().replace("Followed ", "").replace(" people", "").trim();
      const synopsis = $(".synp .entry-content").text().trim();
      const alternativeTitles = $(".alter").text().trim();
      const status = $('.info-content .spe span:contains("Status")').text().replace("Status:", "").trim();
      const network = $('.info-content .spe span:contains("Network") a').text().trim();
      const studio = $('.info-content .spe span:contains("Studio") a').text().trim();
      const released = $('.info-content .spe span:contains("Released")').text().replace("Released:", "").trim();
      const duration = $('.info-content .spe span:contains("Duration")').text().replace("Duration:", "").trim();
      const season = $('.info-content .spe span:contains("Season") a').text().trim();
      const country = $('.info-content .spe span:contains("Country") a').text().trim();
      const type = $('.info-content .spe span:contains("Type")').text().replace("Type:", "").trim();
      const episodes = $('.info-content .spe span:contains("Episodes")').text().replace("Episodes:", "").trim();
      const genres = $(".genxed a").map((_, el) => $(el).text().trim()).get();
      return {
        title: title,
        thumbnail: thumbnail,
        rating: rating,
        followers: followers,
        synopsis: synopsis,
        alternativeTitles: alternativeTitles,
        status: status,
        network: network,
        studio: studio,
        released: released,
        duration: duration,
        season: season,
        country: country,
        type: type,
        episodes: episodes,
        genres: genres
      };
    } catch (error) {
      throw new Error("Error fetching detail: " + error.message);
    }
  }
  async search(query) {
    const url = `https://anichin.date/?s=${encodeURIComponent(query)}`;
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const results = [];
      $(".listupd article").each((_, el) => {
        const title = $(el).find(".tt h2").text().trim();
        const type = $(el).find(".typez").text().trim();
        const status = $(el).find(".bt .epx").text().trim();
        const link = $(el).find("a").attr("href");
        const image = $(el).find("img").attr("src");
        results.push({
          title: title,
          type: type,
          status: status,
          link: link,
          image: image
        });
      });
      return results;
    } catch (error) {
      throw new Error("Error searching: " + error.message);
    }
  }
  async popular() {
    const url = "https://anichin.date/";
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const popularToday = [];
      $(".bixbox .listupd .bsx").each((_, element) => {
        const title = $(element).find(".tt").text().trim();
        const episode = $(element).find(".bt .epx").text().trim();
        const type = $(element).find(".typez").text().trim();
        const link = $(element).find("a").attr("href");
        const image = $(element).find("img").attr("src");
        popularToday.push({
          title: title,
          episode: episode,
          type: type,
          link: link,
          image: image
        });
      });
      return popularToday;
    } catch (error) {
      throw new Error("Error fetching popular today: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req;
  const scraper = new AnichinScraper();
  try {
    if (query.type === "latest") {
      const result = await scraper.latest();
      return res.status(200).json(result);
    } else if (query.type === "episode" && query.url) {
      const result = await scraper.episode(query.url);
      return res.status(200).json(result);
    } else if (query.type === "download" && query.url) {
      const result = await scraper.download(query.url);
      return res.status(200).json(result);
    } else if (query.type === "detail" && query.url) {
      const result = await scraper.detail(query.url);
      return res.status(200).json(result);
    } else if (query.type === "search" && query.query) {
      const result = await scraper.search(query.query);
      return res.status(200).json(result);
    } else if (query.type === "popular") {
      const result = await scraper.popular();
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        error: "Invalid query type or missing parameters"
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}