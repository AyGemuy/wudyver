import fetch from "node-fetch";
class KomeTranscript {
  constructor(url, format) {
    this.videoId = this.extractVideoId(url) || "5C7t4dpL3ck";
    this.useFormat = format === "true";
    this.apiUrl = "https://api.kome.ai/api/tools/youtube-transcripts";
  }
  extractVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|embed\/|v\/|shorts\/))([^&?/\s]+)/);
    return match ? match[1] : null;
  }
  async fetchTranscript() {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://kome.ai/tools/youtube-transcript-generator"
        },
        body: JSON.stringify({
          video_id: this.videoId,
          format: this.useFormat
        })
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    } catch (error) {
      throw new Error(`Fetch failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      format = "true"
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      message: "No url provided"
    });
    const kome = new KomeTranscript(url, format);
    const result = await kome.fetchTranscript();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}