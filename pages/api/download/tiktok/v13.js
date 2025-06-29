import Tiktok from "tiktokapi-src";
class TikTokDownloader {
  async download(url, version = "v1") {
    try {
      const result = await Tiktok.Downloader(url, {
        version: version
      });
      return result;
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    version = "v1"
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  try {
    const downloader = new TikTokDownloader();
    const result = await downloader.download(url, version);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}