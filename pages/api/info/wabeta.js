import apiConfig from "@/configs/apiConfig";
import * as cheerio from "cheerio";
import axios from "axios";
class WABetaInfo {
  async home() {
    try {
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=https://wabetainfo.com`);
      const $ = cheerio.load(data);
      return $('article[id^="post-"]').map((_, el) => ({
        title: $(".entry-title a", el).text().trim(),
        date: new Date($(".published.updated", el).attr("datetime")).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        category: $(".entry-categories a", el).map((_, cat) => $(cat).text().trim().toUpperCase()).get(),
        excerpt: $(".entry-excerpt", el).text().trim(),
        readMoreLink: $(".entry-read-more", el).attr("href")
      })).get().filter(article => Object.values(article).every(value => value !== undefined && value !== ""));
    } catch (error) {
      console.error("Error fetching home page:", error);
      return [];
    }
  }
  async read(url) {
    try {
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${encodeURIComponent(url)}`);
      const $ = cheerio.load(data);
      $(".quads-location, .sharedaddy, .channel_card, style").remove();
      return $('article[id^="post-"]').map((_, el) => ({
        category: ($(el).attr("class").match(/category-(\w+)/i)?.[1] || "").toUpperCase(),
        date: new Date($(".entry-date time", el).attr("datetime")).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        article: $(".kenta-article-content", el).clone().find(".wpra-reactions-container, table").remove().end().text().trim().replace(/\n+/g, "\n"),
        reactions: $(".wpra-reactions-container .wpra-reaction", el).map((_, reaction) => ({
          name: ["Thumbs Up", "Heart", "Laughing", "Surprised", "Angry", "Sad"][$(reaction).index()],
          count: parseInt($(reaction).attr("data-count"), 10)
        })).get(),
        questions: $(".kenta-article-content table tbody tr", el).map((_, row) => ({
          question: $("td:first-child", row).text().trim(),
          answer: $("td:last-child", row).text().trim()
        })).get(),
        image: $(".image-container img", el).map((_, img) => $(img).attr("src")).get(),
        recents: $("#recent-posts-2 ul li a", el).map((_, a) => ({
          title: $(a).text().trim(),
          link: $(a).attr("href")
        })).get()
      })).get();
    } catch (error) {
      console.error("Error fetching article:", error);
      return [];
    }
  }
  async search(q) {
    try {
      const encLink = `https://wabetainfo.com/?s=${encodeURIComponent(q)}`;
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${encodeURIComponent(encLink)}`);
      const $ = cheerio.load(data);
      return $('article[id^="post-"]').map((_, el) => ({
        title: $(".entry-title a", el).text().trim(),
        date: new Date($(".published", el).attr("datetime")).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        category: $(".entry-categories a", el).map((_, cat) => $(cat).text().trim().toUpperCase()).get(),
        excerpt: $(".entry-excerpt", el).text().trim(),
        readMoreLink: $(".entry-read-more", el).attr("href")
      })).get().filter(article => Object.values(article).every(value => value !== undefined && value !== ""));
    } catch (error) {
      console.error("Error fetching search results:", error);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action = "home",
      url,
      q
  } = method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      message: "No action provided"
    });
  }
  try {
    const wabeta = new WABetaInfo();
    let result;
    if (action === "home") {
      result = await wabeta.home();
    } else if (action === "read") {
      if (!url) return res.status(400).json({
        message: "No URL provided for read action"
      });
      result = await wabeta.read(url);
    } else if (action === "search") {
      if (!q) return res.status(400).json({
        message: "No search query provided for search action"
      });
      result = await wabeta.search(q);
    } else {
      return res.status(400).json({
        message: "Invalid action"
      });
    }
    return res.status(200).json({
      result: result
    });
  } catch (e) {
    return res.status(500).json({
      message: e.message
    });
  }
}