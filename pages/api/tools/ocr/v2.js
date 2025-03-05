import fetch from "node-fetch";
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
    const apiUrl = `https://ocr-extract-text.p.rapidapi.com/ocr?url=${encodeURIComponent(url)}`;
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": "8daf878b9fmsh814409db082a5eep1e3fbfjsnd759a2fc4af4",
          "X-RapidAPI-Host": "ocr-extract-text.p.rapidapi.com"
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({
          error: "Failed to fetch OCR data"
        });
      }
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        error: "Internal Server Error",
        details: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}