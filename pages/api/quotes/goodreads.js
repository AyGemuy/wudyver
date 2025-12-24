import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function fetchQuotes(page) {
  try {
    const response = await fetch("https://www.goodreads.com/quotes/tag/indonesia?page=" + page);
    const html = await response.text();
    const $ = cheerio.load(html);
    const quotes = [];
    $(".quoteDetails").each((index, element) => {
      const quoteText = $(".quoteText", element).text().trim();
      const author = $(".authorOrTitle", element).text().trim();
      const tags = $('.quoteFooter a[href^="/quotes/tag/"]', element).map((index, tagElement) => $(tagElement).text().trim()).get();
      const likes = $(".quoteFooter a.smallText", element).text().trim();
      quotes.push({
        quote: quoteText,
        author: author,
        tags: tags,
        likes: likes
      });
    });
    return quotes;
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }
}
export default async function handler(req, res) {
  try {
    const {
      page = 1
    } = req.method === "GET" ? req.query : req.body;
    const quotes = await fetchQuotes(page);
    if (quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      return res.status(200).json(randomQuote);
    } else {
      res.status(404).json({
        error: "No quotes found"
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}