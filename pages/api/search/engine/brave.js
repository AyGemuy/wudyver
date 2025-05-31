import axios from "axios";
import * as cheerio from "cheerio";
class BraveSearch {
  constructor(query) {
    this.query = query;
    this.url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
  }
  async fetchResults() {
    try {
      const {
        data
      } = await axios.get(this.url);
      const $ = cheerio.load(data);
      const results = {
        searchResults: [],
        additionalData: [],
        faq: []
      };
      $(".snippet").each((_, el) => {
        const title = $(el).find(".title").text().trim() || "No Title";
        const description = $(el).find(".snippet-description").text().trim() || "No Description";
        const link = $(el).find("a").attr("href") || "#";
        results.searchResults.push({
          title: title,
          description: description,
          link: link
        });
      });
      $(".t-tertiary.svelte-1yt5tdo").each((_, el) => {
        const attribution = $(el).find(".attribution").text().trim() || "No Attribution";
        const citationLink = $(el).find("cite a").attr("href") || "#";
        results.additionalData.push({
          attribution: attribution,
          citationLink: citationLink
        });
      });
      $(".fq-item").each((_, el) => {
        const question = $(el).find(".faq-q").text().trim() || "No Question";
        const answer = $(el).find(".faq-a").text().trim() || "No Answer";
        const faqLink = $(el).find("a").attr("href") || "#";
        results.faq.push({
          question: question,
          answer: answer,
          faqLink: faqLink
        });
      });
      return results;
    } catch (error) {
      return {
        searchResults: [],
        additionalData: [],
        faq: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query is required"
    });
  }
  const search = new BraveSearch(params.query);
  try {
    const data = await search.fetchResults();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during search request"
    });
  }
}