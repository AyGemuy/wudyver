import axios from "axios";
export default async function handler(req, res) {
  const {
    query = "car",
      per_page = 10
  } = req.method === "GET" ? req.query : req.body;
  const headers = {
    Authorization: "xeK8eZOqeojV6MIWNMo2g5XUZTVm9l3x1kND22VlLhkoZWskNyZaJg4f",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: "https://text-to-image-generator-adityabarai.netlify.app/"
  };
  try {
    const response = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${per_page}`, {
      headers: headers
    });
    if (response.data) {
      return res.status(200).json(response.data);
    } else {
      res.status(404).json({
        error: "No images found"
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch images",
      details: error.message
    });
  }
}