import fetch from "node-fetch";
class YouTubeTranscription {
  constructor(url) {
    this.apiUrl = "https://submagic-free-tools.fly.dev/api/youtube-transcription";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://submagic-free-tools.fly.dev/youtube-transcription"
    };
    this.url = url || "https://youtu.be/5C7t4dpL3ck?si=jSAU22uHVFijVFDR";
  }
  async fetchTranscription() {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          url: this.url
        })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Transcription fetch failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const transcription = new YouTubeTranscription(url);
    const result = await transcription.fetchTranscription();
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