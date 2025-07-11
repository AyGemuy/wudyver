import axios from "axios";
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Query parameter is required"
    });
  }
  try {
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      headers: {
        Authorization: "Client-ID mxr-J3YtqewQPrikLf7npmJY7ZvKKcxg7erlUer4bJM"
      },
      params: {
        query: query
      }
    });
    return res.status(200).json({
      result: response.data.results
    });
  } catch (error) {
    console.error("Error fetching images from Unsplash:", error.response?.data || error.message);
    res.status(500).json({
      error: "Internal server error"
    });
  }
}