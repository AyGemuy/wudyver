import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class XpanasAPI {
  constructor() {
    this.baseUrl = "https://x18.xpanas.wiki";
  }
  async search(query) {
    try {
      const searchUrl = randomProxyUrl + `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);
      const body = await response.text();
      const $ = cheerio.load(body);
      let results = [];
      $(".thumb-block").each((index, element) => {
        const videoLink = $(element).find("a").attr("href");
        const title = $(element).find("a").attr("title");
        const imageUrl = $(element).find("img").attr("data-src");
        const duration = $(element).find("span.duration").text().trim();
        if (videoLink && title && imageUrl && duration) {
          results.push({
            title: title,
            link: `${this.baseUrl}${videoLink}`,
            image: imageUrl,
            duration: duration
          });
        }
      });
      if (results.length === 0) {
        return {
          status: false,
          result: "No results found."
        };
      }
      return {
        status: true,
        result: results
      };
    } catch (error) {
      console.error("Error fetching search results:", error);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async getVideoDetails(videoUrl) {
    try {
      const response = await fetch(randomProxyUrl + videoUrl);
      const body = await response.text();
      const $ = cheerio.load(body);
      let videoDetails = {};
      const title = $("title").text().trim();
      const iframeSrc = $("#wrapper iframe").attr("src");
      const downloadLink = $("a.btn.btn-primary").attr("href");
      const socialLinks = {};
      $(".socialicon li").each((index, element) => {
        const platform = $(element).attr("class").replace("facebook", "Facebook").replace("twitter", "Twitter").replace("whatsapp", "WhatsApp").replace("line", "Line");
        const link = $(element).find("a").attr("href");
        socialLinks[platform] = link;
      });
      videoDetails = {
        title: title,
        iframeSrc: iframeSrc,
        downloadLink: downloadLink,
        socialLinks: socialLinks
      };
      return {
        status: true,
        result: videoDetails
      };
    } catch (error) {
      console.error("Error fetching video details:", error);
      return {
        status: false,
        result: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const api = new XpanasAPI();
  if (action === "search" && query) {
    const result = await api.search(query);
    return res.status(200).json({
      result: result
    });
  } else if (action === "detail" && url) {
    const result = await api.getVideoDetails(url);
    return res.status(200).json({
      result: result
    });
  } else {
    if (!action) {
      return res.status(400).json({
        message: 'Parameter "action" tidak ditemukan. Harap masukkan "search" atau "detail".'
      });
    } else if (action === "search" && !query) {
      return res.status(400).json({
        message: 'Parameter "query" diperlukan untuk pencarian. Harap masukkan kata kunci pencarian.'
      });
    } else if (action === "detail" && !url) {
      return res.status(400).json({
        message: 'Parameter "url" diperlukan untuk detail. Harap masukkan URL yang valid.'
      });
    } else {
      return res.status(400).json({
        message: "Aksi yang tidak valid atau parameter yang hilang."
      });
    }
  }
}