import xv from "xvideos-scraper";
export default async function handler(req, res) {
  const {
    action
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (action === "search") {
      const query = req.query.query ? req.query.query : "stepsis";
      const sort = req.query.sort ? req.query.sort : "relevance";
      const pagination = req.query.pagination ? parseInt(req.query.pagination) : 1;
      const searchResults = await xv.searchVideo({
        search: query,
        sort: sort,
        pagination: pagination
      });
      return res.status(200).json(searchResults);
    }
    if (action === "video") {
      const videoUrl = req.query.url ? req.query.url : null;
      if (!videoUrl) {
        return res.status(400).json({
          error: "URL parameter is required for video action"
        });
      }
      const videoDetails = await xv.getVideoData({
        videoUrl: videoUrl
      });
      return res.status(200).json(videoDetails);
    }
    return res.status(400).json({
      error: "Invalid action"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Something went wrong",
      details: error.message
    });
  }
}