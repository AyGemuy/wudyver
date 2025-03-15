import axios from "axios";
import * as cheerio from "cheerio";
async function step2down(link) {
  try {
    const {
      data: api
    } = await axios.get("https://steptodown.com/");
    const token = cheerio.load(api)("#token").val();
    const {
      data
    } = await axios.post("https://steptodown.com/wp-json/aio-dl/video-data/", new URLSearchParams({
      url: link,
      token: token
    }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Postify/1.0.0"
      }
    });
    return data;
  } catch (error) {
    return {
      error: error.response?.data || error.message
    };
  }
}
export default async function handler(req, res) {
  const {
    url: prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No url provided"
  });
  const result = await step2down(prompt);
  return res.status(200).json(typeof result === "object" ? result : result);
}