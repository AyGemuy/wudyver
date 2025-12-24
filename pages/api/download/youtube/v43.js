import axios from "axios";
class YTSubtitleFetcher {
  async download({
    url
  }) {
    try {
      const apiUrl = `https://yt-helper.com/dapi/vtt_content?format=json&youtube_url=${encodeURIComponent(url)}`;
      const {
        data
      } = await axios.get(apiUrl);
      return data;
    } catch (error) {
      throw new Error("Gagal mengambil subtitle: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const fetcher = new YTSubtitleFetcher();
    const result = await fetcher.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}