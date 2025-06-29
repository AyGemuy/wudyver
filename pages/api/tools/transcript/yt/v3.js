import fetch from "node-fetch";
class YouTubeVideoData {
  constructor(url, include) {
    this.apiUrl = "https://contentforest.com/api/tools/youtube-video-data";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://contentforest.com/transcribe/youtube"
    };
    this.payload = {
      youtube_link: url || "https://youtu.be/5C7t4dpL3ck?si=jSAU22uHVFijVFDR",
      include_transcript: include === "true",
      pick_keys: ["title", "transcript", "is_transcript_fallback"]
    };
  }
  async fetchVideoData() {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(this.payload)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Video data fetch failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    include
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const transcription = new YouTubeVideoData(url, include);
    const result = await transcription.fetchVideoData();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}