import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class PicukiProfile {
  constructor() {
    this.baseUrl = "https://www.picuki.com/profile";
    this.apiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1`;
    this.baseLink = "https://www.picuki.com";
  }
  async getProfileData(username) {
    const url = `${this.baseUrl}/${username}`;
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          url: url
        }
      });
      const $ = cheerio.load(response.data);
      const profileData = {
        profileImage: $(".profile-image").attr("src"),
        username: $(".username").text(),
        postsCount: $(".posts-current").text(),
        posts: []
      };
      $(".posts-video > a.posts__video-item").each((i, el) => {
        const $el = $(el);
        const post = {
          link: this.baseLink + $el.attr("href"),
          image: $el.find("img").attr("src"),
          altText: $el.find("img").attr("alt"),
          downloadLink: $el.find("> div.posts__video-item-story-download").data("source"),
          shareLink: $el.find("> div.posts__video-item-story-share").data("url"),
          musicLink: $el.find("> div.posts__video-item-story-download").data("music")
        };
        profileData.posts.push(post);
      });
      return profileData;
    } catch (error) {
      console.error("Failed to get profile data:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      message: "query is required."
    });
  }
  const picukiProfile = new PicukiProfile();
  try {
    const result = await picukiProfile.getProfileData(query);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error.message
    });
  }
}