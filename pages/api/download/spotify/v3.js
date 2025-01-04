import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  const apiUrl = `https://api-id.wzblueline.xyz/api/dl/spotify?url=${encodeURIComponent(url)}`;
  const headers = {
    Origin: "https://api-id.wzblueline.xyz",
    Referer: "https://api-id.wzblueline.xyz/",
    "Content-Type": "application/json; charset=utf-8",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
  };
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: headers
    });
    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(data);
    } else {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}