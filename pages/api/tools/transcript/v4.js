import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({
    error: "Method not allowed."
  });
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    const response = await fetch("https://submagic-free-tools.fly.dev/api/youtube-transcription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://submagic-free-tools.fly.dev/youtube-transcription"
      },
      body: JSON.stringify({
        url: url || "https://youtu.be/5C7t4dpL3ck?si=jSAU22uHVFijVFDR"
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: errorText
      });
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}