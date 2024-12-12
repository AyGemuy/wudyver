import fetch from "node-fetch";
class Transcript {
  constructor() {
    this.notegptBaseUrl =
      "https://notegpt.io/api/v2/video-transcript?platform=youtube&video_id=";
    this.notegptHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
      Referer: "https://notegpt.io/youtube-transcript-generator",
    };
    this.tactiqUrl = "https://tactiq-apps-prod.tactiq.io/transcript";
    this.tactiqHeaders = {
      "Content-Type": "application/json",
    };
  }
  async notegpt(videoId) {
    try {
      const url = `${this.notegptBaseUrl}${videoId}`;
      const response = await fetch(url, {
        headers: this.notegptHeaders,
        compress: true,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching NoteGPT transcript:", error);
    }
  }
  async tactiq(videoId) {
    try {
      const response = await fetch(this.tactiqUrl, {
        method: "POST",
        headers: this.tactiqHeaders,
        body: JSON.stringify({
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          langCode: "en",
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching Tactiq transcript:", error);
    }
  }
}
const transcript = new Transcript();

const notegpt = async (videoId) => {
  try {
    return await transcript.notegpt(videoId);
  } catch (error) {
    console.error("Error in notegpt:", error);
    throw error;
  }
};

const tactiq = async (videoId) => {
  try {
    return await transcript.tactiq(videoId);
  } catch (error) {
    console.error("Error in tactiq:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { id, v } = req.query;

  if (!(id || v)) return res.status(400).json({ message: "No id, v provided" });

  const result = v && v === "1" ? await notegpt(url) : await tactiq(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
