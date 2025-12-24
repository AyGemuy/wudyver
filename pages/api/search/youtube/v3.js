import fetch from "node-fetch";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  const {
    query,
    limit
  } = req.method === "GET" ? req.query : req.body;
  const searchQuery = encodeURIComponent(query || "Hello");
  const searchLimit = limit ? parseInt(limit) : 5;
  try {
    const response = await fetch(`https://${apiConfig.DOMAIN_KOYEB}/ytdl/search?query=${searchQuery}&limit=${searchLimit}`);
    const data = await response.json();
    if (data) {
      return res.status(200).json(data);
    } else {
      res.status(404).json({
        error: "No results found."
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Something went wrong while fetching data."
    });
  }
}