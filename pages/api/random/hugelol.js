import axios from "axios";
import * as cheerio from "cheerio";
class HugelolScraper {
  async home(category = null) {
    const url = category && ["rising", "fresh"].includes(category) ? `https://hugelol.com/${category}` : "https://hugelol.com/";
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      return $(".post-container").map((_, el) => ({
        title: $(el).find(".title").text().trim() || "No title",
        link: $(el).find("a").attr("href") || null,
        image: $(el).find("img").attr("src") || null,
        videos: $(el).find("video source").map((_, vid) => $(vid).attr("src")).get() || [],
        points: $(el).find(".score-info").text().trim() || "0 points",
        comments: $(el).find(".link-grey2").eq(1).text().trim() || "0 comments",
        author: $(el).find(".link-").text().trim() || "Unknown",
        time: $(el).find(".timeago").attr("title") || "Unknown"
      })).get();
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const posts = $("#content-container .post").map((_, el) => ({
        title: $(el).find(".title").text().trim(),
        link: $(el).find("a").attr("href"),
        videoSources: $(el).find("video source").map((_, v) => $(v).attr("src")).get(),
        points: $(el).find(".score-info").text().trim(),
        comments: $(el).find(".link-grey2").eq(1).text().trim(),
        time: $(el).find(".timeago").attr("title")
      })).get();
      const profiles = $(".content-side.right .profile").map((_, el) => ({
        username: $(el).find(".username").text().trim(),
        avatar: $(el).find("img.avatar").attr("src"),
        karma: $(el).find(".karma-badge").text().trim(),
        badge: $(el).find(".badge").text().trim()
      })).get();
      const nextPosts = $("#next-posts .next_box").map((_, el) => ({
        title: $(el).find(".next_title").text().trim(),
        link: $(el).find("a").attr("href"),
        thumbnail: $(el).find("img").attr("data-original")
      })).get();
      return {
        posts: posts,
        profiles: profiles,
        nextPosts: nextPosts
      };
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    category,
    url
  } = req.method === "GET" ? req.query : req.body;
  const scraper = new HugelolScraper();
  try {
    let data;
    switch (action) {
      case "home":
        data = await scraper.home(category);
        break;
      case "detail":
        data = await scraper.detail(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}