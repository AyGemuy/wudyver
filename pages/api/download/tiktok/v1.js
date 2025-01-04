import axios from "axios";
export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Method Not Allowed"
      });
    }
    const {
      url: query
    } = req.method === "GET" ? req.query : req.body;
    if (!query) {
      return res.status(400).json({
        error: "Query url is required"
      });
    }
    const response = await axios.post("https://lovetik.com/api/ajax/search", new URLSearchParams({
      query: query
    }));
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}