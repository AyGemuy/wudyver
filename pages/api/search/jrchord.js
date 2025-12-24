import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class JrchordSearcher {
  constructor() {
    this.baseURL = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8`;
    this.html2imgURL = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/v8`;
    this.targetURL = "https://www.jrchord.com/search";
  }
  async search({
    query,
    limit = 5
  }) {
    if (!query) throw new Error("Query cannot be empty.");
    try {
      const encodedQuery = encodeURIComponent(query);
      const searchURL = `${this.targetURL}?q=${encodedQuery}#gsc.tab=0&gsc.q=${encodedQuery}`;
      const response = await axios.get(`${this.baseURL}?url=${encodeURIComponent(searchURL)}`);
      let parsedResults = this.parseResult(response.data);
      const resultsToProcess = parsedResults.slice(0, limit);
      const finalResults = [];
      for (const searchResult of resultsToProcess) {
        let detailData = {};
        let imageData = {};
        try {
          const details = await this.getChordDetails(searchResult.url);
          detailData = {
            title: details.title,
            chordUrl: details.url,
            chordContent: details.chordContent,
            htmlChordContent: details.htmlChordContent
          };
          if (details && details.htmlChordContent) {
            const imageUrl = await this.convertHtmlToImage(details.htmlChordContent);
            console.log(`Image for "${details.title}" converted. Download URL: ${imageUrl}`);
            imageData = {
              imageUrl: imageUrl,
              imageFileName: `${details.title}`
            };
          } else {
            throw new Error("HTML chord content not found in details for image conversion.");
          }
        } catch (itemError) {
          console.warn(`Failed to process "${searchResult.title}": ${itemError.message}`);
          detailData = {
            ...detailData,
            error: itemError.message
          };
          imageData = {
            ...imageData,
            error: `Processing failed: ${itemError.message}`
          };
        }
        finalResults.push({
          search: searchResult,
          ...detailData,
          ...imageData
        });
      }
      return finalResults;
    } catch (error) {
      console.error("Error during search:", error.message);
      throw error;
    }
  }
  parseResult(html) {
    const $ = cheerio.load(html);
    const results = [];
    $(".gsc-resultsRoot .gsc-webResult.gsc-result").each((index, element) => {
      const resultElement = $(element);
      const titleAnchor = resultElement.find(".gs-title a").first();
      let title = titleAnchor.text().trim();
      let url = titleAnchor.attr("href");
      const snippet = resultElement.find(".gs-snippet").text().trim();
      if (title.endsWith(" - JRChord")) {
        title = title.substring(0, title.length - " - JRChord".length).trim();
      }
      if (title && url && url.includes("jrchord.com") && !url.includes("/search") && !url.includes("google.com/url")) {
        results.push({
          title: title,
          url: url,
          snippet: snippet || "No snippet available."
        });
      }
    });
    return results.filter((result, index, self) => index === self.findIndex(r => r.url === result.url));
  }
  async getChordDetails(chordURL) {
    try {
      const response = await axios.get(`${this.baseURL}?url=${encodeURIComponent(chordURL)}`);
      const $ = cheerio.load(response.data);
      let title = $("h1.song-detail-title").text().trim();
      const artist = $(".song-detail-artist").text().trim();
      const preElement = $("pre[data-key]").first();
      if (title.endsWith(" - JRChord")) {
        title = title.substring(0, title.length - " - JRChord".length).trim();
      }
      const htmlChordContent = preElement.length ? $.html(preElement) : "";
      const textChordContent = preElement.length ? preElement.text().trim() : "";
      if (!title || !textChordContent) throw new Error("Could not extract title or chord content from the page.");
      return {
        title: title,
        artist: artist,
        url: chordURL,
        chordContent: textChordContent,
        htmlChordContent: htmlChordContent
      };
    } catch (error) {
      console.error("Error fetching chord details:", error.message);
      throw error;
    }
  }
  async convertHtmlToImage(htmlContent) {
    try {
      const response = await axios.post(this.html2imgURL, {
        html: htmlContent
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (response.data && response.data.url) {
        return response.data.url;
      } else {
        throw new Error("HTML to image conversion failed: No URL found in response.");
      }
    } catch (error) {
      console.error("Error converting HTML to image:", error.message);
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
    const searcher = new JrchordSearcher();
    const response = await searcher.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}