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
    } = await axios.get(`https://www.tiktokstalk.com/user/${username}`);
    const $ = cheerio.load(data);
    const formattedNumber = numStr => {
      const num = parseInt(numStr.replace(/[^\d]/g, ""), 10);
      return isNaN(num) ? "NaN" : num.toLocaleString();
    };
    const result = {
      profileImage: $(".user-info figure img").attr("src") || "No image",
      username: $(".user-info .title h1").text().trim() || "No username",
      fullName: $(".user-info .title h2").text().trim() || "No full name",
      bio: $(".user-info .description p").text().trim() || "No bio",
      likes: formattedNumber($(".number-box .count:eq(0)").text()) || "0",
      followers: formattedNumber($(".number-box .count:eq(1)").text()) || "0",
      following: formattedNumber($(".number-box .count:eq(2)").text()) || "0"
    };
    return res.status(200).json({
      result: result
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Failed to fetch user data"
    });
  }
}