import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    number
  } = req.method === "GET" ? req.query : req.body;
  if (!number) return res.status(400).json({
    error: "Invalid request"
  });
  const url = `https://the-flash-md-sessions.onrender.com/code?number=${number}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.code) return res.status(404).json({
      error: "Code not found"
    });
    res.json({
      code: data.code
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch"
    });
  }
}