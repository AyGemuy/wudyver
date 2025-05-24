import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function fetchSearchResults(q) {
  try {
    const url = `https://apkfab.com/search?q=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);
    return $(".list-template.lists .list").map((index, element) => ({
      title: $(element).find(".title").text().trim(),
      link: $(element).find("a").attr("href"),
      image: $(element).find(".icon img").attr("data-src"),
      rating: $(element).find(".other .rating").text().trim(),
      review: $(element).find(".other .review").text().trim()
    })).get();
  } catch (error) {
    console.error("Error fetching search results:", error);
    return [];
  }
}
async function fetchDownloadDetails(url) {
  try {
    const response = await fetch(url.endsWith("/download") ? url : url + "/download");
    const body = await response.text();
    const $ = cheerio.load(body);
    const title = $(".download_button_box a.down_btn").attr("title");
    const link = $(".download_button_box a.down_btn").attr("href");
    const downloadURL = `https://d.apkpure.com/b/APK/${link.split("/")[4]}?version=latest`;
    return {
      title: title,
      link: link,
      downloadURL: downloadURL
    };
  } catch (error) {
    console.error("Error fetching download details:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (action === "search") {
      if (!query) {
        return res.status(400).json({
          message: "Query is required"
        });
      }
      const results = await fetchSearchResults(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const downloadDetails = await fetchDownloadDetails(url);
      return res.status(200).json(downloadDetails);
    } else {
      return res.status(400).json({
        message: "Invalid action"
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}