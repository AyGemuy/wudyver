import axios from "axios";
class YouTubeService {
  constructor() {
    this.baseUrl = "https://line.1010diy.com/";
  }
  async youtubeSearch(query) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}web/free-mp3-finder/query`, {
        params: {
          q: query,
          type: "youtube",
          pageToken: ""
        },
        headers: {
          "User -Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching YouTube search results:", error);
      throw new Error("Failed to fetch YouTube search results. Please try again later.");
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Parameter 'query' is required"
    });
  }
  try {
    const ytSearch = new YouTubeService();
    const result = await ytSearch.youtubeSearch(query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}