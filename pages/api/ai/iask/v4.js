import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class iAsk {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async question({
    prompt,
    mode = "question",
    detail_level = "detailed",
    ...otherParams
  }) {
    try {
      const query = prompt || "Halo";
      const queryParams = new URLSearchParams({
        mode: mode,
        "options[detail_level]": detail_level,
        q: query,
        ...otherParams
      });
      const isLink = encodeURIComponent(`https://iask.ai/?${queryParams.toString()}`);
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${isLink}`, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const outputDiv = $("#output");
      if (!outputDiv.length) {
        return JSON.stringify({
          image: [],
          answer: null,
          sources: [],
          videoSource: [],
          webSearch: []
        }, null, 2);
      }
      const answerText = $("#text").text().trim();
      const [answer, sourcesText] = answerText.split("Top 3 Authoritative Sources Used in Answering this Question");
      const cleanedAnswer = answer.replace(/According to Ask AI & Question AI www\.iAsk\.ai:\s*/, "").trim();
      const sources = sourcesText ? sourcesText.split("\n").map(s => s.trim()).filter(Boolean) : [];
      const images = [];
      outputDiv.find("img").each((_, img) => {
        images.push($(img).attr("src"));
      });
      const videoSources = [];
      $("#related-videos a").each((_, el) => {
        const videoElement = $(el);
        const videoTitle = videoElement.find("h3").text().trim() || "No title found";
        const videoThumbnail = videoElement.find("img").attr("src") || "No thumbnail found";
        const videoLink = videoElement.attr("href");
        if (videoTitle !== "No title found" && videoThumbnail !== "No thumbnail found") {
          videoSources.push({
            title: videoTitle,
            link: videoLink,
            thumbnail: videoThumbnail
          });
        }
      });
      const webSearchResults = [];
      $("#related-links a").each((_, el) => {
        const linkElement = $(el);
        const linkTitle = linkElement.text().trim();
        const linkUrl = linkElement.attr("href");
        const linkImage = linkElement.find("img").attr("src") || "No image found";
        const linkDescription = linkElement.next().text().trim() || "No description found";
        if (linkTitle && linkUrl) {
          webSearchResults.push({
            title: linkTitle,
            link: linkUrl,
            image: linkImage,
            description: linkDescription
          });
        }
      });
      const result = {
        image: images,
        answer: cleanedAnswer,
        sources: sources,
        videoSource: videoSources,
        webSearch: webSearchResults
      };
      return JSON.stringify(result, null, 2);
    } catch (error) {
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt parameter is required"
    });
  }
  try {
    const fetcher = new iAsk();
    const data = await fetcher.question({
      prompt: prompt,
      ...params
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch answer from iask.ai"
    });
  }
}