import axios from "axios";
export default async function handler(req, res) {
  const {
    term
  } = req.method === "GET" ? req.query : req.body;
  if (!term) {
    return res.status(400).json({
      error: "Search term is required."
    });
  }
  try {
    const response = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        origin: "*",
        format: "json",
        srsearch: term
      }
    });
    return res.status(200).json(response.data.query.search);
  } catch (error) {
    console.error("Error fetching Wikipedia data:", error);
    return res.status(500).json({
      error: "Failed to fetch data."
    });
  }
}