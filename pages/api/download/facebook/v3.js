import * as cheerio from "cheerio";
import fetch from "node-fetch";
async function fbdown(url) {
  try {
    const postOptions = {
        method: "POST",
        body: new URLSearchParams({
          URLz: url
        })
      },
      response = await fetch("https://fdown.net/download.php", postOptions),
      html = await response.text(),
      $ = cheerio.load(html);
    return {
      title: $(".lib-row.lib-header").text().trim(),
      description: $(".lib-row.lib-desc").text().trim(),
      sdLink: $("#sdlink").attr("href"),
      hdLink: $("#hdlink").attr("href")
    };
  } catch (error) {
    return console.error("Error:", error.message), null;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const result = await fbdown(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}