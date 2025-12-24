import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method === "POST" || req.method === "GET") {
    const {
      country = "auto",
        text = ""
    } = req.method === "POST" ? req.body : req.query;
    if (!text) {
      return res.status(400).json({
        status: 1,
        error: "Text is required"
      });
    }
    const payload = {
      prompt: {
        type: 1,
        tone: "",
        writer: "",
        targetLang: country.trim(),
        text: text,
        industry: "general",
        format: null,
        summarizeType: "paragraph",
        url: "",
        translateType: "text",
        speechType: "plaintext"
      }
    };
    try {
      const response = await fetch("https://api.openl.io/translate/v1", {
        method: "POST",
        headers: {
          "X-Chunk-Index": "first",
          "Content-Type": "application/json",
          secret: "IEODE9aBhM",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://openl.io/id"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.text();
      if (data) {
        return res.status(200).send(data);
      }
      return res.status(500).json({
        status: 1,
        error: "Translation failed",
        details: data
      });
    } catch (error) {
      console.error("Error:", error.message);
      return res.status(500).json({
        status: 1,
        error: "Internal Server Error"
      });
    }
  }
  return res.status(405).json({
    status: 1,
    error: "Method Not Allowed"
  });
}