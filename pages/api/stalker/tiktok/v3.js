import Tiktok from "tiktokapi-src";
class TikTokDownloader {
  async search(username) {
    try {
      const result = await Tiktok.StalkUser(username);
      return result;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) {
    return res.status(400).json({
      error: "username is required"
    });
  }
  try {
    const downloader = new TikTokDownloader();
    const result = await downloader.search(username);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}