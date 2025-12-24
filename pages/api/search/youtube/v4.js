import axios from "axios";
class YouTubeService {
  constructor() {
    this.baseUrl = "https://line.1010diy.com/";
  }
  async search(query) {
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
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching YouTube search results:", error);
      throw new Error("Failed to fetch YouTube search results. Please try again later.");
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}web/free-mp3-finder/detail`, {
        params: {
          url: url
        },
        headers: {
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching YouTube video details:", error);
      throw new Error("Failed to fetch YouTube video details. Please try again later.");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' is required"
    });
  }
  const ytService = new YouTubeService();
  try {
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Paramenter 'query' is required for search action"
        });
        result = await ytService.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "Paramenter 'url' is required for detail action"
        });
        result = await ytService.detail(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action specified"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}