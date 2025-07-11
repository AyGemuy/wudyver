import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "Missing url parameter"
    });
    const response = await fetch(`https://v.api.aa1.cn/api/api-bz/temp.php?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("Failed to fetch data");
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message
    });
  }
}