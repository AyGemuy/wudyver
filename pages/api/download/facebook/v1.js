import axios from "axios";
import * as cheerio from "cheerio";
import fakeUserAgent from "fake-useragent";
import {
  FormData
} from "formdata-node";
class Scraper {
  async getData(url) {
    try {
      const date = String(Date.now()).slice(0, 10);
      const response = await axios.post("https://yt5s.io/api/ajaxSearch/facebook", {
        q: url,
        vt: "facebook"
      }, {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: "https://yt5s.io",
          Referer: "https://yt5s.io/en20/facebook-downloader",
          Cookie: `.AspNetCore.Culture=c%3Den%7Cuic%3Den; _ga=GA1.1.2011585369.${date}; _ga_P5PP4YVN0Y=GS1.1.${date}.4.1.${date}.0.0.0`,
          "User-Agent": fakeUserAgent(),
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      return response.data.data;
    } catch (error) {
      console.error("Error while fetching Facebook data:", error.message);
      throw error;
    }
  }
  parseData(html) {
    try {
      const $ = cheerio.load(html);
      const img = $("div.image-fb img").attr("src") || "";
      const title = $("h3").text().trim() || "";
      const duration = $("p").eq(0).text().trim() || "";
      const links = $("a.download-link-fb").get().map(el => {
        const em = $(el);
        return {
          quality: em.closest("tr").find(".video-quality").text().trim() || "",
          url: em.attr("href") || ""
        };
      }).filter(v => v.url);
      return {
        img: img,
        title: title,
        duration: duration,
        links: links
      };
    } catch (error) {
      console.error("Error while parsing HTML:", error.message);
      return [];
    }
  }
  async download({
    url
  }) {
    try {
      const data = await this.getData(url);
      const videoLinks = this.parseData(data);
      console.log("Video Links:", videoLinks);
      return videoLinks;
    } catch (error) {
      console.error("Error during the video links retrieval process:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const scraper = new Scraper();
    const response = await scraper.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}