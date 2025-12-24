import axios from "axios";
class MediaScraper {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }
  async fetchData(url) {
    try {
      const response = await axios.post(this.apiUrl, new URLSearchParams({
        url: url
      }).toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://instasave.website/download"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return null;
    }
  }
  async extractMedia(instagramUrl) {
    try {
      const html = await this.fetchData(instagramUrl);
      if (!html) return [];
      const regex = /token=([^&"]+)/g;
      let match;
      const tokens = [];
      while ((match = regex.exec(html)) !== null) {
        const trimmedToken = match[1].slice(0, -2);
        tokens.push({
          url: `https://cdn.instasave.website/?token=${trimmedToken}`
        });
      }
      return tokens;
    } catch (error) {
      console.error("Error extracting media:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const scraper = new MediaScraper("https://api.instasave.website/media");
  try {
    const result = await scraper.extractMedia(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({
      message: "Error during media download",
      error: error.message
    });
  }
}