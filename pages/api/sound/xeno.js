import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    query,
    id
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    success: false,
    message: "Query is required"
  });
  try {
    const response = await fetch(`https://xeno-canto.org/api/2/recordings?query=${query}`);
    if (!response.ok) throw new Error(`Failed to fetch data`);
    const {
      recordings
    } = await response.json();
    const result = id ? recordings[parseInt(id) - 1] : recordings;
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}