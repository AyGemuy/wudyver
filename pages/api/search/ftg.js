import axios from "axios";
const BASE_URL = "https://www.freetogame.com/api";
export default async function handler(req, res) {
  const {
    action = "",
      id,
      platform,
      category,
      sortBy,
      tags
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (!action) {
      return res.status(400).json({
        result: [],
        message: "Invalid action"
      });
    }
    let url = "";
    switch (action) {
      case "games":
        url = `${BASE_URL}/games`;
        if (platform) url += `?platform=${platform}`;
        if (category) url += `${platform ? "&" : "?"}category=${category}`;
        if (sortBy) url += `${platform || category ? "&" : "?"}sort-by=${sortBy}`;
        break;
      case "filter":
        if (!tags) return res.status(400).json({
          result: [],
          message: "Tags are required for filtering"
        });
        url = `${BASE_URL}/filter?tag=${tags}`;
        if (platform) url += `&platform=${platform}`;
        break;
      case "game":
        if (!id) return res.status(400).json({
          result: [],
          message: "Game ID is required"
        });
        url = `${BASE_URL}/game?id=${id}`;
        break;
      default:
        return res.status(400).json({
          result: [],
          message: "Invalid action"
        });
    }
    const {
      data
    } = await axios.get(url);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      result: [],
      message: error.response?.data || "An unexpected error occurred"
    });
  }
}