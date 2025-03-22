import axios from "axios";
import * as cheerio from "cheerio";
class AnilistClient {
  constructor(baseURL = "https://anilist.co") {
    this.baseURL = baseURL;
  }
  async populer() {
    try {
      const response = await axios.get(this.baseURL);
      const html = response.data;
      const $ = cheerio.load(html);
      const extractMediaCards = selector => $(selector).map((_, element) => {
        const title = $(element).find(".title").text().trim();
        const link = this.baseURL + $(element).find("a.cover").attr("href");
        const image = $(element).find("img.image").attr("src");
        return {
          title: title,
          link: link,
          image: image
        };
      }).get();
      return {
        trending: extractMediaCards(".landing-section.trending .results .media-card"),
        populer: extractMediaCards(".landing-section.season .results .media-card"),
        upcoming: extractMediaCards(".landing-section.nextSeason .results .media-card"),
        top: $(".landing-section.top .results .media-card").map((_, element) => {
          const rank = $(element).find(".rank").text().trim();
          const title = $(element).find(".title").text().trim();
          const link = this.baseURL + $(element).find("a.cover").attr("href");
          const image = $(element).find("img.image").attr("src");
          return {
            rank: rank,
            title: title,
            link: link,
            image: image
          };
        }).get()
      };
    } catch (error) {
      console.error("Error scraping AniList:", error);
      return null;
    }
  }
  async search(query) {
    try {
      const response = await axios.get(`${this.baseURL}/search/anime?query=${encodeURIComponent(query)}`);
      const $ = cheerio.load(response.data);
      return $(".media-card").map((_, element) => {
        const title = $(element).find(".title").text().trim();
        const imageUrl = $(element).find(".image").attr("src");
        const link = $(element).find(".cover").attr("href");
        return title && imageUrl && link ? {
          title: title,
          imageUrl: imageUrl,
          link: `${this.baseURL}${link}`
        } : null;
      }).get();
    } catch (error) {
      console.error("Error fetching search data:", error);
      return [];
    }
  }
  async detail(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const cleanText = text => text.replace(/\n\s+/g, " ").trim();
      const description = cleanText($(".description.content-wrap").text());
      const descriptionParagraphs = description.split("\n").filter(p => p.trim());
      const translateText = async text => {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(text)}`);
        const data = await res.json();
        return data[0][0][0];
      };
      const translatedParagraphs = await Promise.all(descriptionParagraphs.map(p => translateText(p)));
      return {
        title: {
          romaji: cleanText($(".content h1").first().text()),
          english: cleanText($('div.data-set:contains("English") .value').text()),
          native: cleanText($('div.data-set:contains("Native") .value').text())
        },
        description: {
          original: description,
          translated: translatedParagraphs.join("\n\n")
        },
        cover: $(".cover-wrap-inner .cover").attr("src"),
        details: {
          format: cleanText($('div.data-set:contains("Format") .value').text()),
          episodes: cleanText($('div.data-set:contains("Episodes") .value').text()),
          season: cleanText($('div.data-set:contains("Season") .value').text())
        },
        genres: $('div.data-set:contains("Genres") .value a').map((_, el) => $(el).text().trim()).get()
      };
    } catch (error) {
      console.error("Error fetching detail data:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      query,
      url
    } = req.method === "GET" ? req.query : req.body;
    const Anilist = new AnilistClient();
    if (!action) return res.status(400).json({
      error: "Missing action parameter"
    });
    switch (action) {
      case "populer":
        const populerData = await Anilist.populer();
        return res.status(200).json(populerData);
      case "search":
        if (!query) return res.status(400).json({
          error: "Missing query parameter"
        });
        const searchData = await Anilist.search(query);
        return res.status(200).json(searchData);
      case "detail":
        if (!url) return res.status(400).json({
          error: "Missing url parameter"
        });
        const detailData = await Anilist.detail(url);
        return res.status(200).json(detailData);
      default:
        return res.status(400).json({
          error: "Invalid action parameter"
        });
    }
  } catch (error) {
    console.error("API Handler Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}