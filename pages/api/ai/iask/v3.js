import fetch from "node-fetch";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  const query = req.method === "GET" ? req.query.query : req.body.query;
  if (!query) return res.status(400).json({
    error: "Query required"
  });
  try {
    const response = await fetch(`https://${apiConfig.DOMAIN_KOYEB}/ask?query=${query}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch from iask.ai"
    });
  }
}