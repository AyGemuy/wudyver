import axios from "axios";
import * as cheerio from "cheerio";
const BASE = "https://www.liputan6.com";
class Liputan6Scraper {
  constructor() {
    this.baseURL = BASE;
    console.log("Liputan6Scraper initialized.");
  }
  async getNews({
    query = "terbaru",
    limit = 5
  } = {}) {
    console.log(`Starting news retrieval for query: "${query || "N/A"}" with limit: ${limit}`);
    try {
      const searchUrl = query ? `${this.baseURL}/search?q=${encodeURIComponent(query)}` : this.baseURL;
      console.log(`Fetching articles from: ${searchUrl}`);
      const {
        data
      } = await axios.get(searchUrl);
      const $ = cheerio.load(data);
      const initialArticles = [];
      $(".articles--iridescent-list--text-item, .article-snippet").each((_idx, el) => {
        const $el = $(el);
        const id = $el.attr("data-article-id") || $el.attr("data-id") || $el.attr("id") || "No ID Found";
        const title = $el.attr("data-title") || $el.find("h4.article-snippet--numbered__title a.article-snippet__link").text().trim() || $el.find("a.article-snippet__title-link span.article-snippet__title-text").text().trim() || $el.find(".articles--iridescent-list--text-item__title-link").text().trim() || "No Title";
        const type = $el.attr("data-type") || "Unknown Type";
        const channel = $el.attr("data-channel") || $el.find("span.article-snippet--numbered__category").text().trim() || $el.find("span.article-snippet__channel").text().trim() || "No Category";
        const category = $el.attr("data-category") || channel;
        const link = $el.find("a.article-snippet__link").attr("href") || $el.find("a.article-snippet__title-link").attr("href") || $el.find(".articles--iridescent-list--text-item__title-link").attr("href");
        const fullLink = link ? link.startsWith("http") ? link : this.baseURL + link : "No URL";
        const thumb = $el.find("picture.big img.js-lazyload").attr("data-src") || $el.find("img.article-snippet--media-figure__picture-img").attr("src") || $el.find("img").attr("data-src") || $el.find("img").attr("src") || "No Image";
        const publishedDate = $el.find(".article-snippet__date time.timeago").attr("datetime") || "No Date";
        initialArticles.push({
          status: 200,
          id: id,
          title: title,
          url: fullLink,
          category: category,
          date: publishedDate,
          image: thumb,
          type: type
        });
      });
      const filteredAndLimitedArticles = initialArticles.slice(0, limit);
      console.log(`Found ${filteredAndLimitedArticles.length} articles after initial parsing and limiting.`);
      const detailPromises = filteredAndLimitedArticles.map(async item => {
        if (item.url && item.url !== "No URL") {
          const detail = await this.getDetail(item.url);
          if (detail.status === false) {
            console.warn(`Could not get full detail for ${item.url}. Returning partial info.`);
            return {
              ...item,
              detail: {
                status: false,
                title: detail.title || item.title,
                description: detail.description || "Could not retrieve full description.",
                image: detail.image || item.image,
                published: detail.published || item.date,
                author: detail.author || "N/A",
                content: detail.content || "Content not available.",
                message: detail.message,
                error: detail.error
              }
            };
          }
          return {
            ...item,
            detail: detail
          };
        }
        console.warn(`Article "${item.title}" has no valid URL. Skipping detail fetch.`);
        return {
          ...item,
          detail: {
            status: false,
            title: item.title,
            description: "No valid URL for detail.",
            image: item.image,
            published: item.date,
            author: "N/A",
            content: "Content not available.",
            message: "No valid URL for detail"
          }
        };
      });
      const resultsWithDetails = await Promise.all(detailPromises);
      console.log("Successfully fetched details for all articles within limit.");
      return resultsWithDetails;
    } catch (err) {
      console.error(`Error in getNews: ${err.message}`);
      return {
        status: false,
        message: err.message
      };
    }
  }
  async getDetail(url) {
    console.log(`Getting detail content for: ${url}`);
    let currentPage = 1;
    let fullHtml = "";
    let hasNextPage = true;
    try {
      while (hasNextPage) {
        const pageUrl = currentPage === 1 ? url.split("?")[0] : `${url.split("?")[0]}?page=${currentPage}`;
        console.log(`Fetching page ${currentPage} of detail from: ${pageUrl}`);
        const {
          data
        } = await axios.get(pageUrl);
        fullHtml += data;
        const $ = cheerio.load(data);
        hasNextPage = $(".paging__link--next").get().length > 0;
        if (hasNextPage) console.log(`More pages found for ${url}. Moving to page ${currentPage + 1}.`);
        else console.log(`No more pages found for ${url}.`);
        currentPage++;
      }
      const $ = cheerio.load(fullHtml);
      console.log(`Parsing detail content for: ${url}`);
      const title = $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || $("head > title").text() || "No Title";
      const description = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || $('meta[name="twitter:description"]').attr("content") || "No Description";
      const image = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "No Image";
      const published = $('meta[property="article:published_time"]').attr("content") || $("div.article-attributes time").eq(0).attr("datetime") || $("time").eq(0).text() || "No Publish Date";
      const author = $('meta[name="author"]').attr("content") || $('div.article-attributes a[href*="/penulis/"]').eq(0).text().trim() || "No Author";
      const content = $(".article-content-body__item-page p").map((_idx, el) => $(el).text().trim()).get().filter(Boolean).join("\n\n") || "No Content";
      console.log(`Successfully parsed detail for: ${title}`);
      return {
        status: 200,
        title: title,
        description: description,
        image: image,
        published: published,
        author: author,
        content: content
      };
    } catch (err) {
      console.error(`Error fetching detail for ${url}: ${err.message}`);
      return {
        status: false,
        url: url,
        message: "Failed to retrieve full detail content",
        error: err.message,
        title: $('meta[property="og:title"]').attr("content") || $("head > title").text() || "Detail Not Available",
        description: $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || "Detail content could not be loaded.",
        image: $('meta[property="og:image"]').attr("content") || "No Image",
        published: "N/A",
        author: "N/A",
        content: "Content could not be retrieved."
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const scraper = new Liputan6Scraper();
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}