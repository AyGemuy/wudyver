import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class DapurUmamiScraper {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept: "application/json",
        Connection: "keep-alive"
      }
    });
    this.targetBaseUrl = "https://www.dapurumami.com";
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
      console.error(`Error fetching HTML via proxy for ${targetUrl}: ${error.message}`);
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
      details.title = "N/A";
      details.main_image = "N/A";
      details.rating = "N/A";
      details.likes = 0;
      details.duration = "N/A";
      details.servings = "N/A";
      details.description = "N/A";
      details.ingredients = [];
      details.steps = [];
      details.title = $("h1.text-center.m-0.py-3").eq(0).text().trim() || "N/A";
      const mainImageEl = $(".imageWrapper img.lazy.entered.loaded").eq(0);
      if (mainImageEl.length > 0) {
        details.main_image = mainImageEl.attr("src") || "N/A";
      }
      const ratingCount = $(".ratingStarModaller b.text-black").eq(0);
      if (ratingCount.length > 0) {
        details.rating = ratingCount.text().trim();
      }
      const heartCount = $(".heart-container span.count").eq(0);
      if (heartCount.length > 0) {
        details.likes = parseInt(heartCount.text().trim()) || 0;
      }
      const durationEl = $(".bestStatus .each").eq(0).find("b").eq(0);
      if (durationEl.length > 0) {
        details.duration = durationEl.text().trim();
      }
      const servingsEl = $(".bestStatus .each").eq(1).find("b").eq(0);
      if (servingsEl.length > 0) {
        details.servings = servingsEl.text().trim();
      }
      const descriptionEl = $(".aboutFood p.paragraph").eq(0);
      if (descriptionEl.length > 0) {
        details.description = descriptionEl.text().trim();
      }
      $(".dynamicContent .row-cols-md-4 .col.whiteBg").each((_, el) => {
        const categoryTitle = $(el).find("p.topTitle").eq(0).text().trim() || "General";
        const items = $(el).find("table.tableCustomized td").get().map(td_el => $(td_el).text().trim());
        if (items.length > 0) {
          details.ingredients.push({
            category: categoryTitle,
            items: items
          });
        }
      });
      $(".stepToMake .eachStep").each((_, el) => {
        const stepNum = $(el).find(".circle").eq(0).text().trim();
        const stepDesc = $(el).find("p").eq(0).text().trim();
        const stepImageEl = $(el).find("img.my-4.p-0").eq(0);
        const stepImage = stepImageEl.attr("src") || "N/A";
        if (stepNum && stepDesc) {
          details.steps.push({
            number: stepNum,
            description: stepDesc,
            image: stepImage
          });
        }
      });
      return {
        status: "success",
        data: details
      };
    } catch (error) {
      console.error(`Error processing details from ${recipeUrl}: ${error.message}`);
      return {
        status: "error",
        message: error.message
      };
    }
  }
  async search({
    query = "cilok",
    limit = 3
  }) {
    const targetSearchUrl = `${this.targetBaseUrl}/search?q=${encodeURIComponent(query)}&tab=recipe&sort=relevan`;
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
      const recipeCards = $("#tab_list-recipe .wrappedInfo.col");
      const initialRecipes = [];
      recipeCards.each((index, el) => {
        if (initialRecipes.length >= limit) {
          return false;
        }
        const card = $(el);
        const titleEl = card.find(".content p.twoliners").eq(0);
        const linkEl = card.find("a").eq(0);
        const imageEl = card.find(".imgWrapper img").eq(0);
        const authorEl = card.find(".by span").eq(0);
        const ratingCountEl = card.find(".stars .count").eq(0);
        const likesCountEl = card.find(".heart-container .count").eq(0);
        const timeCountEl = card.find(".timeWrapper .count").eq(0);
        const title = titleEl.text().trim() || "N/A";
        const link = linkEl.attr("href") || "N/A";
        const image = imageEl.attr("src") || "N/A";
        const author = authorEl.text().trim() || "N/A";
        const rating = ratingCountEl.text().trim() || "N/A";
        const likes = parseInt(likesCountEl.text().trim()) || 0;
        const time = timeCountEl.text().trim() || "N/A";
        initialRecipes.push({
          title: title,
          link: link,
          image: image,
          author: author,
          rating: rating,
          likes: likes,
          time: time
        });
      });
      const detailedRecipes = [];
      for (const recipe of initialRecipes) {
        console.log(`Workspaceing details for: ${recipe.title} (${recipe.link})`);
        const detailsResult = await this.getRecipeDetails(recipe.link);
        if (detailsResult.status === "success") {
          detailedRecipes.push({
            ...recipe,
            details: detailsResult.data
          });
        }
      }
      return {
        total_results_on_page: recipeCards.length,
        limit: limit,
        list: detailedRecipes
      };
    } catch (error) {
      console.error(`Error during search for '${query}': ${error.message}`);
      if (error.response) {
        console.error(`Response data: ${JSON.stringify(error.response.data)}`);
        console.error(`Response status: ${error.response.status}`);
      }
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
    const scraper = new DapurUmamiScraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}