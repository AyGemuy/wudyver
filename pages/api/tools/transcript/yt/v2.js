import fetch from "node-fetch";
class Transcript {
  constructor(url) {
    this.videoId = this.extractVideoId(url);
    if (!this.videoId) throw new Error("Invalid YouTube URL");
  }
  extractVideoId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|embed\/|v\/|shorts\/))([^&?/\s]+)/);
    return match ? match[1] : null;
  }
  async fetchTranscript(url, options) {
    try {
      const response = await fetch(url, options);
      return await response.json();
    } catch (error) {
      throw new Error(`Fetch failed: ${error.message}`);
    }
  }
  async notegpt() {
    const url = `https://notegpt.io/api/v2/video-transcript?platform=youtube&video_id=${this.videoId}`;
    return await this.fetchTranscript(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://notegpt.io/youtube-transcript-generator"
      }
    });
  }
  async tactiq() {
    const url = "https://tactiq-apps-prod.tactiq.io/transcript";
    return await this.fetchTranscript(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        videoUrl: `https://www.youtube.com/watch?v=${this.videoId}`,
        langCode: "en"
      })
    });
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      type = "1"
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      message: "No url provided"
    });
    const transcript = new Transcript(url);
    const result = type === "1" ? await transcript.notegpt() : await transcript.tactiq();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}