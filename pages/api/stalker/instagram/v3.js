import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class InstagramScraper {
  constructor() {
    this.axiosInstance = wrapper(axios.create({
      jar: new CookieJar(),
      headers: {
        "user-agent": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
      }
    }));
  }
  async fetchData(username) {
    if (!username) {
      throw new Error("Username is required");
    }
    try {
      const {
        data
      } = await this.axiosInstance.get(`https://dumpor.com/v/${username}`);
      const $ = cheerio.load(data);
      const res = {
        uname: ($("#user-page > div.user > div.row > div > div.user__title > h4").text() || "").replace(/@/gi, "").trim() || "No username",
        name: ($("#user-page > div.user > div.row > div > div.user__title > a > h1").text() || "No name").trim(),
        profilePic: ($("#user-page > div.user > div.row > div > div.user__img").attr("style") || "").replace(/(background-image: url\(\'|\'\);)/gi, "").trim() || "No profile pic",
        bio: ($("#user-page > div.user > div.row > div > div.user__info-desc").text() || "No bio").trim(),
        followers: ($("#user-page > div.user > div.row > div > ul > li").eq(1).text() || "").replace(/Followers/gi, "").trim() || "0",
        following: ($("#user-page > div.user > div > div.col-md-4.col-8.my-3 > ul > li").eq(2).text() || "").replace(/Following/gi, "").trim() || "0",
        posts: ($("#user-page > div.user > div > div.col-md-4.col-8.my-3 > ul > li").eq(0).text() || "").replace(/Posts/gi, "").trim() || "0"
      };
      return res;
    } catch (error) {
      console.error(error);
      throw new Error("Username tidak ditemukan!");
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
  const scraper = new InstagramScraper();
  try {
    const result = await scraper.fetchData(query);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}