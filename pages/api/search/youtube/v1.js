import axios from "axios";
class YouTubeSearch {
  constructor() {
    this.apiUrl = "https://api.flvto.top/@api/search/YouTube/";
  }
  async search(query) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await axios.get(`${this.apiUrl}${encodedQuery}`, {
        headers: {
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Origin: "https://keepvid.online",
          Referer: "https://keepvid.online/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        }
      });
      return response.data.items || [];
    } catch (error) {
      return {
        status: "error",
        message: `Error fetching data: ${error.message}`
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required"
    });
  }
  try {
    const ytSearch = new YouTubeSearch();
    const result = await ytSearch.search(query);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}