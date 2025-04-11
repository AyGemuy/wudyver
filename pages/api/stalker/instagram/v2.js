import axios from "axios";
class WebScraper {
  constructor(apiKey = "0") {
    this.apiKey = apiKey;
    this.baseUrl = "https://webstagram.org/api";
  }
  async search(query) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          username: query,
          source: "instagram"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "POST" ? req.body : req.query;
  if (!query) {
    return res.status(400).json({
      message: "query is required."
    });
  }
  try {
    const Scraper = new WebScraper();
    const result = await Scraper.search(query);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}