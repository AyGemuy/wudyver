import Tiktok from "tiktokapi-src";
class TikTokDownloader {
  async search(query, type = "user") {
    try {
      const result = await Tiktok.Search(query, {
        type: type
      });
      return result;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    query,
    type = "user"
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Query is required"
    });
  }
  try {
    const downloader = new TikTokDownloader();
    const result = await downloader.search(query, type);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}