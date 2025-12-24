import connectMongo from "@/lib/mongoose";
import Request from "@/models/Request";
import Visitor from "@/models/Visitor";
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    const {
      type
    } = req.method === "GET" ? req.query : req.body;
    try {
      await connectMongo();
      if (type === "request" || type === "all") {
        const requestResult = await Request.findOneAndUpdate({
          _id: "request"
        }, {
          count: 0
        }, {
          new: true,
          upsert: true
        });
        return res.status(200).json({
          message: "Request count has been reset to 0",
          requestCount: requestResult.count
        });
        return;
      }
      if (type === "visitor" || type === "all") {
        const visitorResult = await Visitor.findOneAndUpdate({
          _id: "visitor"
        }, {
          count: 0
        }, {
          new: true,
          upsert: true
        });
        return res.status(200).json({
          message: "Visitor count has been reset to 0",
          visitorCount: visitorResult.count
        });
        return;
      }
      res.status(400).json({
        error: 'Invalid type parameter. Use "request", "visitor", or "all".'
      });
    } catch (error) {
      console.error("Error resetting count:", error);
      res.status(500).json({
        error: "Failed to reset count"
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}