import axios from "axios";
import cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) {
    return res.status(400).json({
      error: "Username is required"
    });
  }
  try {
    const {
      data
    } = await axios.get(`https://dumpor.com/v/${username}`, {
      headers: {
        "user-agent": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        cookie: "_inst_key=SFMyNTY.g3QAAAABbQAAAAtfY3NyZl90b2tlbm0AAAAYT3dzSXI2YWR6SG1fNFdmTllfZnFIZ1Ra.5Og9VRy7gUy9IsCwUeYW8O8qvHbndaus-cqBRaZ7jcg;"
      }
    });
    const $ = cheerio.load(data);
    const results = {
      username: ($("#user-page > div.user > div.row > div > div.user__title > h4").text() || "").replace(/@/gi, "").trim() || "No username",
      fullName: ($("#user-page > div.user > div.row > div > div.user__title > a > h1").text() || "No name").trim(),
      profilePicHD: ($("#user-page > div.user > div.row > div > div.user__img").attr("style") || "").replace(/(background-image: url\(\'|\'\);)/gi, "").trim() || "No profile pic",
      bio: ($("#user-page > div.user > div.row > div > div.user__info-desc").text() || "No bio").trim(),
      followers: ($("#user-page > div.user > div.row > div > ul > li").eq(1).text() || "").replace(/Followers/gi, "").trim() || "0",
      followersM: ($("#user-page > div.container > div > div > div:nth-child(1) > div > a").eq(2).text() || "").replace(/Followers/gi, "").trim() || "0",
      following: ($("#user-page > div.user > div > div.col-md-4.col-8.my-3 > ul > li").eq(2).text() || "").replace(/Following/gi, "").trim() || "0",
      followingM: ($("#user-page > div.container > div > div > div:nth-child(1) > div > a").eq(3).text() || "").replace(/Following/gi, "").trim() || "0",
      postsCount: ($("#user-page > div.user > div > div.col-md-4.col-8.my-3 > ul > li").eq(0).text() || "").replace(/Posts/gi, "").trim() || "0",
      postsCountM: ($("#user-page > div.container > div > div > div:nth-child(1) > div > a").eq(0).text() || "").replace(/Posts/gi, "").trim() || "0"
    };
    return res.status(200).json({
      result: results
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Username tidak ditemukan!"
    });
  }
}