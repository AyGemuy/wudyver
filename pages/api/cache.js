import Encoder from "@/lib/encoder";
export default async function handler(req, res) {
  const {
    action
  } = req.method === "GET" ? req.query : req.body;
  try {
    switch (action) {
      case "clear":
        const clearResult = await Encoder.clearCache();
        res.status(200).json({
          success: true,
          message: `Cache cleared. Removed ${clearResult.deletedCount} entries.`,
          data: clearResult
        });
        break;
      case "list":
      case "log":
        const logResult = await Encoder.logCache();
        res.status(200).json({
          success: true,
          message: "Cache log retrieved successfully.",
          data: logResult
        });
        break;
      case "total":
        const cacheSize = await Encoder.getCacheSize();
        res.status(200).json({
          success: true,
          message: "Cache size retrieved successfully.",
          data: {
            count: cacheSize
          }
        });
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Invalid action. Use "clear", "list", "log", or "total".'
        });
        break;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `An error occurred: ${error.message}`
    });
  }
}