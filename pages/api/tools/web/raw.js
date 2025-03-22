import axios from "axios";
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "URL is required"
      });
    }
    try {
      const response = await axios.get(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      return res.status(200).json({
        data: response.data
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Failed to fetch data"
      });
    }
  } else {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}