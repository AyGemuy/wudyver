import axios from "axios";
class InfluencerSearch {
  constructor() {
    this.url = "https://influencers.club/wp-admin/admin-ajax.php";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://influencers.club/instagram-bio-search/"
    };
  }
  async search(query) {
    const data = new URLSearchParams();
    data.append("location[]", "Indonesia");
    data.append("keywords[]", query);
    data.append("from_followers", "0");
    data.append("to_followers", "999999999");
    data.append("toolName", "instagram");
    data.append("action", "get_data_from_api");
    data.append("keywordHashtagSlector", "keywords");
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error during the search:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      message: "query is required."
    });
  }
  const viewer = new InfluencerSearch();
  try {
    const result = await viewer.search(query);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error.message
    });
  }
}