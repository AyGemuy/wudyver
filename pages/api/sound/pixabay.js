import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class AudioScraper {
  constructor() {
    this.htmlGetBaseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8?url=`;
    this.pixabayBaseUrl = "https://pixabay.com";
    this.pixabaySearchUrl = `${this.pixabayBaseUrl}/sound-effects/search/`;
  }
  async getAudioDetails(audioPageUrl) {
    try {
      const url = `${this.htmlGetBaseUrl}${audioPageUrl}`;
      const response = await axios.get(url);
      const html = response.data;
      const $ = cheerio.load(html);
      const scriptTags = $('script[type="application/ld+json"]');
      let audioDetails = null;
      scriptTags.each((i, element) => {
        const scriptContent = $(element).html();
        if (scriptContent) {
          try {
            const jsonData = JSON.parse(scriptContent);
            if (jsonData["@type"] === "AudioObject" && jsonData.contentUrl) {
              audioDetails = {
                ...jsonData,
                contentUrl: jsonData.contentUrl || null,
                name: jsonData.name || null,
                description: jsonData.description || null,
                uploadDate: jsonData.uploadDate || null,
                duration: jsonData.duration || null,
                thumbnailUrl: jsonData.thumbnailUrl || null,
                creatorName: jsonData.creator ? jsonData.creator.name : null,
                license: jsonData.license || null
              };
              return false;
            }
          } catch (parseError) {
            console.warn("Gagal memparsing JSON-LD:", parseError.message);
          }
        }
      });
      return audioDetails;
    } catch (error) {
      console.error(`Error getting audio details for ${audioPageUrl}:`, error.message);
      return null;
    }
  }
  async search({
    query,
    limit = 2
  }) {
    try {
      const searchUrl = `${this.htmlGetBaseUrl}${this.pixabaySearchUrl}${query}`;
      const response = await axios.get(searchUrl);
      const html = response.data;
      const $ = cheerio.load(html);
      const audioDataList = [];
      const audioRows = $(".audioRow--nAm4Z");
      for (let i = 0; i < Math.min(limit, audioRows.length); i++) {
        const element = audioRows[i];
        const $element = $(element);
        const audioRelativePath = $element.find("a.title--7N7Nr").attr("href");
        const audioPageURL = audioRelativePath ? `${this.pixabayBaseUrl}${audioRelativePath}` : "#";
        const audioData = {
          title: $element.find(".title--7N7Nr").text().trim() || "No Title",
          author: $element.find(".name--yfZpi").text().trim() || "Unknown Author",
          duration: $element.find(".duration--bLi2C").text().trim() || "00:00",
          tags: $element.find(".tags--sWF4K a").map((i, el) => $(el).text().trim()).get(),
          likes: $element.find(".counter--jXsIb").text().trim() || "0",
          thumbnailURL: $element.find(".thumbnail--TvKkc img").attr("src") || "no_thumbnail.jpg",
          isFeatured: $element.find('.icon--4zP+9[aria-label="Featured"]').length > 0,
          isShielded: $element.find('.icon--4zP+9[aria-label="Shield"]').length > 0,
          audioPageURL: audioPageURL,
          authorProfileURL: $element.find("a.name--yfZpi").attr("href") || "#",
          details: null
        };
        if (audioData.audioPageURL && audioData.audioPageURL !== "#") {
          audioData.details = await this.getAudioDetails(audioData.audioPageURL);
        }
        audioDataList.push(audioData);
      }
      return audioDataList;
    } catch (error) {
      console.error("Error during audio scraping:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const scraper = new AudioScraper();
    const response = await scraper.search(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}