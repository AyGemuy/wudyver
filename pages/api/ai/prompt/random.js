import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  try {
    const response = await fetch("https://getimg.ai/api/prompts/random", {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://getimg.ai/text-to-image"
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch data from the API"
      });
    }
    const data = await response.json();
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}