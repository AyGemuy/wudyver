import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed. Use GET method."
    });
  }
  const {
    video_id,
    format
  } = req.method === "GET" ? req.query : req.body;
  const videoId = video_id ? video_id : "https://youtu.be/5C7t4dpL3ck?si=M8OB1eSDE_Y4pP_C";
  const useFormat = format === "true" ? true : false;
  try {
    const response = await fetch("https://api.kome.ai/api/tools/youtube-transcripts", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://kome.ai/tools/youtube-transcript-generator"
      },
      body: JSON.stringify({
        video_id: videoId,
        format: useFormat
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: errorText
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
}