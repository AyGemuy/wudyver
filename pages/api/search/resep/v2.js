import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class MasakApaHariIniScraper {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Accept: "application/json",
        Connection: "keep-alive"
      }
    });
    this.targetBaseUrl = "https://www.masakapahariini.com";
  }
  async fetchHtmlViaProxy(targetUrl) {
    try {
      const response = await this.client.get("", {
        params: {
          url: targetUrl
        }
      });
      if (response.data) {
        return response.data;
      } else {
        throw new Error("Invalid response from proxy API: Missing HTML data.");
      }
    } catch (error) {
      console.error(`Error fetching HTML via proxy for ${targetUrl}:`, error.message);
      return null;
    }
  }
  async getRecipeDetails(recipeUrl) {
    try {
      const html = await this.fetchHtmlViaProxy(recipeUrl);
      if (!html) {
        return null;
      }
      const $ = cheerio.load(html);
      const details = {};
      const titleElement = $("header._section-title h1");
      details.title = titleElement.text().trim() || "N/A";
      const excerptElement = $("div.excerpt");
      details.description = excerptElement.text().trim() || "N/A";
      const mainImageElement = $("figure.recipe-image picture img");
      details.full_image = mainImageElement.attr("data-src") || mainImageElement.attr("src") || "N/A";
      const authorElement = $("div.author");
      if (authorElement.length) {
        const parts = authorElement.text().split("|").map(p => p.trim());
        details.author = parts[0] || "N/A";
        details.publish_date = parts[1] || "N/A";
      } else {
        details.author = "N/A";
        details.publish_date = "N/A";
      }
      const ingredientsList = [];
      let currentCategory = "General";
      $("div._recipe-ingredients p.recipe-ingredients-title, div._recipe-ingredients .d-flex").each((_, element) => {
        const el = $(element);
        if (el.hasClass("recipe-ingredients-title")) {
          currentCategory = el.text().trim();
        } else if (el.hasClass("d-flex")) {
          const part = el.find(".part").text().trim();
          const itemText = el.find(".item").text().trim();
          if (itemText) {
            ingredientsList.push(`${currentCategory}: ${part} ${itemText}`);
          }
        }
      });
      details.ingredients = ingredientsList.length > 0 ? ingredientsList.join(" • ") : "N/A";
      const stepsList = [];
      $("div._recipe-steps .step").each((_, element) => {
        const el = $(element);
        const stepNum = el.find(".number-step").text().trim();
        const stepText = el.find(".content p").text().trim();
        if (stepNum && stepText) {
          stepsList.push(`${stepNum}. ${stepText}`);
        }
      });
      details.steps = stepsList.length > 0 ? stepsList.join("\n") : "N/A";
      return details;
    } catch (error) {
      console.error(`Error processing details from ${recipeUrl}:`, error.message);
      return null;
    }
  }
  async search({
    query = "cilok",
    limit = 3
  }) {
    const targetSearchUrl = `${this.targetBaseUrl}/?s=${encodeURIComponent(query)}`;
    const html = await this.fetchHtmlViaProxy(targetSearchUrl);
    if (!html) {
      return {
        total_results_on_page: 0,
        limit: limit,
        list: []
      };
    }
    try {
      const $ = cheerio.load(html);
      const recipeCards = $("section._recipes-list ._recipe-card");
      const initialRecipes = [];
      recipeCards.each((index, element) => {
        if (initialRecipes.length >= limit) {
          return false;
        }
        const card = $(element);
        const titleElement = card.find("h3.card-title a");
        const title = titleElement.text().trim() || "N/A";
        let link = titleElement.attr("href") || "N/A";
        const imageElement = card.find("picture img");
        const image = imageElement.attr("data-src") || imageElement.attr("src") || "N/A";
        const features = {};
        card.find("._recipe-features .btn.item").each((_, itemEl) => {
          const text = $(itemEl).text().trim();
          if (text.includes("jam") || text.includes("mnt")) {
            features.time = text;
          } else if (text.includes("Kkal")) {
            features.calories = text;
          } else {
            features.difficulty = text;
          }
        });
        initialRecipes.push({
          title: title,
          link: link,
          image: image,
          features: features
        });
      });
      const detailedRecipes = [];
      for (const recipe of initialRecipes) {
        console.log(`Workspaceing details for: ${recipe.title}`);
        const details = await this.getRecipeDetails(recipe.link);
        if (details) {
          detailedRecipes.push({
            ...recipe,
            details: details
          });
        }
      }
      return {
        total_results_on_page: recipeCards.length,
        limit: limit,
        list: detailedRecipes
      };
    } catch (error) {
      console.error(`Error processing search results for '${query}':`, error.message);
      return {
        total_results_on_page: 0,
        limit: limit,
        list: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const scraper = new MasakApaHariIniScraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}