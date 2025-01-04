import {
  PornHub
} from "pornhub.js";
export default async function handler(req, res) {
  const {
    action
  } = req.method === "GET" ? req.query : req.body;
  const pornhub = new PornHub();
  try {
    if (action === "search") {
      const query = req.query.query ? req.query.query : "tokyo hot";
      const searchResults = await pornhub.searchVideo(query);
      return res.status(200).json({
        result: searchResults
      });
    }
    if (action === "video") {
      const url = req.query.url ? req.query.url : null;
      if (!url) {
        return res.status(400).json({
          error: "URL parameter is required for video action"
        });
      }
      const videoDetails = await pornhub.video(url);
      return res.status(200).json({
        result: videoDetails
      });
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