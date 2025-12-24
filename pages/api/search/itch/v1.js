import axios from "axios";
import * as cheerio from "cheerio";
class ItchIoScraper {
  constructor() {
    this.baseUrl = "https://itch.io";
  }
  async fetchData(url) {
    try {
      const response = await axios.get(url);
      return cheerio.load(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
    }
  }
  async scrapeItchIo(url) {
    const $ = await this.fetchData(url);
    const items = [];
    const links = [];
    const authors = [];
    const titles = [];
    $("div.game_title > a").each((_, element) => {
      links.push($(element).attr("href"));
      titles.push($(element).text().trim());
    });
    $("div.game_author > a").each((_, element) => {
      authors.push($(element).attr("href"));
    });
    const genres = $("div.game_genre");
    const platforms = $("span.web_flag");
    const descriptions = $("div.game_text");
    const ratings = $("span.screenreader_only");
    for (let i = 0; i < 10; i++) {
      items.push({
        Title: titles[i] || "Unknown",
        Genre: $(genres[i]).text().trim() || "Unknown",
        Platform: $(platforms[i]).text().trim() || "Unknown",
        Description: $(descriptions[i]).text().trim() || "Unknown",
        Rating: $(ratings[i]).text().trim() || "Unknown",
        Author: authors[i] || "Unknown",
        Link: links[i] || "Unknown"
      });
    }
    return items;
  }
  async search(query) {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
    return await this.scrapeItchIo(url);
  }
  async getGames() {
    const url = `${this.baseUrl}/games`;
    return await this.scrapeItchIo(url);
  }
  async getTools() {
    const url = `${this.baseUrl}/tools`;
    return await this.scrapeItchIo(url);
  }
  async getGameAssets() {
    const url = `${this.baseUrl}/game-assets`;
    return await this.scrapeItchIo(url);
  }
  async getComics() {
    const url = `${this.baseUrl}/comics`;
    return await this.scrapeItchIo(url);
  }
  async getBooks() {
    const url = `${this.baseUrl}/books`;
    return await this.scrapeItchIo(url);
  }
  async getPhysicalGames() {
    const url = `${this.baseUrl}/physical-games`;
    return await this.scrapeItchIo(url);
  }
  async getSoundtracks() {
    const url = `${this.baseUrl}/soundtracks`;
    return await this.scrapeItchIo(url);
  }
  async getGameMods() {
    const url = `${this.baseUrl}/game-mods`;
    return await this.scrapeItchIo(url);
  }
  async getMisc() {
    const url = `${this.baseUrl}/misc`;
    return await this.scrapeItchIo(url);
  }
}
export default async function handler(req, res) {
  const scraper = new ItchIoScraper();
  const {
    method
  } = req;
  try {
    const query = method === "GET" ? req.query : req.body;
    let result;
    if (method === "GET") {
      const {
        search,
        category
      } = query;
      if (search) {
        result = await scraper.search(search);
      } else if (category) {
        switch (category) {
          case "games":
            result = await scraper.getGames();
            break;
          case "tools":
            result = await scraper.getTools();
            break;
          case "game-assets":
            result = await scraper.getGameAssets();
            break;
          case "comics":
            result = await scraper.getComics();
            break;
          case "books":
            result = await scraper.getBooks();
            break;
          case "physical-games":
            result = await scraper.getPhysicalGames();
            break;
          case "soundtracks":
            result = await scraper.getSoundtracks();
            break;
          case "game-mods":
            result = await scraper.getGameMods();
            break;
          case "misc":
            result = await scraper.getMisc();
            break;
          default:
            return res.status(400).json({
              error: "Invalid category"
            });
        }
      } else {
        return res.status(400).json({
          error: "No valid query or category"
        });
      }
    } else if (method === "POST") {
      const {
        url
      } = query;
      if (!url) {
        return res.status(400).json({
          error: "URL is required in the body for POST"
        });
      }
      result = await scraper.scrapeItchIo(url);
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}