import axios from "axios";
class BingSearch {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://www.bingapis.com/api/v6";
  }
  async search(type = "images", query = "cars", options = {}, ...params) {
    try {
      const response = await axios.get(`${this.baseUrl}/${type}/search`, {
        headers: {
          "Content-Type": "application/json"
        },
        params: Object.assign({
          appid: this.apiKey,
          q: query,
          count: options.count ?? 10,
          offset: options.offset ?? 10,
          safeSearch: options.safeSearch ?? "Moderate"
        }, ...params)
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      throw new Error(`Failed to fetch ${type}`);
    }
  }
}
const apiKey = "D41D8CD98F00B204E9800998ECF8427E4F4A7492";
export default async function handler(req, res) {
  const {
    query,
    type,
    count,
    offset,
    safeSearch,
    ...extraParams
  } = req.method === "GET" ? req.query : req.body;
  try {
    const bingSearch = new BingSearch(apiKey);
    const data = await bingSearch.search(type ?? "images", query ?? "cars", {
      count: count ? parseInt(count) : 10,
      offset: offset ? parseInt(offset) : 10,
      safeSearch: safeSearch || "Moderate"
    }, extraParams);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}