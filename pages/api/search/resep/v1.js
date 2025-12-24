import axios from "axios";
import * as cheerio from "cheerio";
class CookpadScraper {
  constructor() {
    this.client = axios.create({
      baseURL: "https://cookpad.com",
      headers: {
        accept: "text/html, application/xhtml+xml",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://cookpad.com/id",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async getRecipeDetails(url) {
    try {
      const response = await this.client.get(url);
      const html = response.data;
      const $ = cheerio.load(html);
      const recipeDetails = {};
      const recipeImageElement = $("#recipe_image img");
      recipeDetails.full_image = recipeImageElement.attr("src") || "N/A";
      recipeDetails.title = $('h1[data-toggle-class-target-id-value="header--recipe-title"]').text().trim() || "N/A";
      const authorLink = $('a[href*="/id/pengguna/"]');
      recipeDetails.author = authorLink.find("span.text-cookpad-14").text().trim() || "N/A";
      recipeDetails.author_username = authorLink.find('span[dir="ltr"]').text().trim() || "N/A";
      recipeDetails.author_avatar = authorLink.find("picture img").attr("src") || "N/A";
      recipeDetails.author_location = authorLink.find(".location .mise-icon-text").text().trim() || "N/A";
      const ingredientsList = [];
      $("#ingredients .ingredient-list ol li").each((_, element) => {
        const ingredientText = $(element).text().trim();
        if (ingredientText) {
          ingredientsList.push(ingredientText);
        }
      });
      recipeDetails.ingredients = ingredientsList.length > 0 ? ingredientsList.join(" • ") : "N/A";
      const stepsList = [];
      $("#steps ol.list-none li.step").each((_, element) => {
        const stepNumber = $(element).find(".flex-shrink-0 > div").text().trim();
        const stepText = $(element).find('div[dir="auto"] p').text().trim();
        if (stepText) {
          stepsList.push(`${stepNumber}. ${stepText}`);
        }
      });
      recipeDetails.steps = stepsList.length > 0 ? stepsList.join("\n") : "N/A";
      return recipeDetails;
    } catch (error) {
      console.error(`Terjadi kesalahan saat mengambil detail dari ${url}:`, error.message);
      return null;
    }
  }
  async search({
    query = "cilok",
    limit = 3
  }) {
    try {
      const response = await this.client.get(`/id/cari/${encodeURIComponent(query)}`);
      const html = response.data;
      const $ = cheerio.load(html);
      const searchResultsContainer = $("ul#search-recipes-list");
      let total = 0;
      const trackingParamsValue = searchResultsContainer.attr("data-search-tracking-params-value");
      if (trackingParamsValue) {
        try {
          const params = JSON.parse(trackingParamsValue);
          total = parseInt(params.total_hits, 10) || 0;
        } catch (parseError) {
          total = searchResultsContainer.find('li[id^="recipe_"]').length;
        }
      } else {
        total = searchResultsContainer.find('li[id^="recipe_"]').length;
      }
      const initialRecipes = [];
      searchResultsContainer.find('li[id^="recipe_"]').each((index, element) => {
        if (initialRecipes.length >= limit) {
          return false;
        }
        const el = $(element);
        const title = el.find("h2 a.block-link__main").text().trim() || "N/A";
        let link = el.find("h2 a.block-link__main").attr("href") || "";
        if (link && !link.startsWith("http")) {
          link = `https://cookpad.com${link}`;
        }
        let ingredientsArray = [];
        const ingredientsAttrValue = el.find('div[data-controller="ingredients-highlighter"]').attr("data-ingredients-highlighter-ingredients-value");
        if (ingredientsAttrValue) {
          try {
            ingredientsArray = JSON.parse(ingredientsAttrValue);
          } catch (e) {
            const ingredientsText = el.find('div[data-ingredients-redesign-target="ingredients"] div.line-clamp-3').text().trim();
            if (ingredientsText) {
              ingredientsArray = ingredientsText.split("•").map(ing => ing.trim()).filter(ing => ing);
            } else {
              ingredientsArray = ["N/A"];
            }
          }
        } else {
          const ingredientsText = el.find('div[data-ingredients-redesign-target="ingredients"] div.line-clamp-3').text().trim();
          if (ingredientsText) {
            ingredientsArray = ingredientsText.split("•").map(ing => ing.trim()).filter(ing => ing);
          } else {
            ingredientsArray = ["N/A"];
          }
        }
        const ingredients = Array.isArray(ingredientsArray) ? ingredientsArray.join(" • ") : ingredientsArray || "N/A";
        const authorName = el.find("div.flex.items-center span.break-all span").first().text().trim() || "N/A";
        const authorAvatarElement = el.find("div.flex.items-center picture img");
        const authorAvatar = authorAvatarElement.attr("src") || "";
        const recipeImageElement = el.find("div.flex-none picture img");
        let recipeImage = recipeImageElement.attr("src") || "";
        const webpSourceSet = el.find('div.flex-none picture source[type="image/webp"]').attr("srcset");
        if (webpSourceSet) {
          recipeImage = webpSourceSet.split(",")[0].trim().split(" ")[0];
        }
        initialRecipes.push({
          id: el.attr("id")?.replace("recipe_", "") || null,
          title: title,
          link: link,
          ingredients: ingredients,
          author: authorName,
          author_avatar: authorAvatar,
          image: recipeImage
        });
      });
      const detailedRecipes = [];
      for (const recipe of initialRecipes) {
        const details = await this.getRecipeDetails(recipe.link);
        if (details) {
          detailedRecipes.push({
            ...recipe,
            details: details
          });
        }
      }
      return {
        total: total,
        list: detailedRecipes
      };
    } catch (error) {
      console.error(`Terjadi kesalahan saat mencari "${query}":`, error.message);
      if (error.response) {} else if (error.request) {}
      return {
        total: 0,
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
    const scraper = new CookpadScraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}