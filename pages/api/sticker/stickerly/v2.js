import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const response = await fetch(`https://weeb-api.vercel.app/stickerly?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    if (response.ok) {
      return res.status(200).json(data);
    } else {
      return res.status(response.status).json(data);
    }
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch data from Stickerly API"
    });
  }
}