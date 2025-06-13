import axios from "axios";
import * as cheerio from "cheerio";
class Dongeng {
  constructor() {
    this.nextPageUrl = "https://www.1000dongeng.com/";
    this.posts = [];
  }
  async list() {
    try {
      while (this.nextPageUrl) {
        const {
          data
        } = await axios.get(this.nextPageUrl);
        const $ = cheerio.load(data);
        $(".date-outer .date-posts .post-outer").each((index, element) => {
          const title = $(element).find(".post-title a").text();
          const link = $(element).find(".post-title a").attr("href");
          const author = $(element).find(".post-author .fn").text().trim();
          const date = $(element).find(".post-timestamp .published").text();
          const image = $(element).find(".post-thumbnail amp-img").attr("src") || "Image not available";
          this.posts.push({
            title: title,
            link: link,
            author: author,
            date: date,
            image: image
          });
        });
        const nextLink = $(".blog-pager-older-link").attr("href");
        this.nextPageUrl = nextLink ? nextLink : null;
      }
      return {
        total: this.posts.length,
        posts: this.posts
      };
    } catch (error) {
      console.error("Error fetching the website:", error);
      throw new Error("Error fetching the website");
    }
  }
  async getDongeng(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const title = $("h1.post-title.entry-title").text().trim();
      const author = $(".post-author .fn").text().trim();
      const storyContent = $(".superarticle").find("div").map((i, el) => {
        return $(el).text().trim();
      }).get().join("\n");
      return {
        title: title,
        author: author,
        storyContent: storyContent
      };
    } catch (error) {
      console.error("Error fetching the website:", error);
      throw new Error("Error fetching the website");
    }
  }
}
const dongeng = new Dongeng();
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      action,
      url
    } = req.method === "GET" ? req.query : req.body;
    if (action === "list") {
      try {
        const posts = await dongeng.list();
        return res.status(200).json(posts);
      } catch (error) {
        return res.status(500).json({
          error: "Error fetching posts"
        });
      }
    }
    if (action === "getDongeng" && url) {
      try {
        const dongengDetail = await dongeng.getDongeng(url);
        return res.status(200).json(dongengDetail);
      } catch (error) {
        return res.status(500).json({
          error: "Error fetching dongeng detail"
        });
      }
    }
    return res.status(400).json({
      error: "Invalid action or missing URL"
    });
  } else {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}