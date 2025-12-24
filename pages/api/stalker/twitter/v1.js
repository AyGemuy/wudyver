import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) return res.status(400).json({
    error: "Username is required"
  });
  try {
    const response = await axios.get(`https://www.twuko.com/${username}/`);
    const $ = cheerio.load(response.data);
    const result = {
      pp_user: $("div.relative.w-full.h-full.rounded-full.cursor-pointer.profile-image > img").attr("src") ?? null,
      name: $("div.p-3 > p.text-center.text-primary").text().trim() || "No name",
      username: $("div.p-3 > div > span.font-bold.text-center").text().trim() || "No username",
      followers: $("div.mb-4.text-4xl.font-bold.text-center").text().trim() || "0 followers",
      description: $("div.p-3.border-t.border-gray-200 > p").text().trim().replace(/\n/g, "") || "No description",
      ...Object.fromEntries($("div.flex.justify-center > div.px-4").map((idx, el) => [$(el).find("div.text-xs.font-bold.text-center.text-gray-600.uppercase").text().toLowerCase(), $(el).find("div.text-xl.font-bold.text-center").text()]))
    };
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve data"
    });
  }
}