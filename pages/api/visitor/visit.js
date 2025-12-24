import connectMongo from "@/lib/mongoose";
import Visitor from "@/models/Visitor";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "GET" || req.method === "POST") {
    try {
      const result = await Visitor.findOneAndUpdate({
        _id: "visitor"
      }, {
        $inc: {
          count: 1
        }
      }, {
        new: true,
        upsert: true
      });
      return res.status(200).json({
        message: "Visitor count updated",
        count: result.count
      });
    } catch (error) {
      console.error("Error updating visitor count:", error);
      res.status(500).json({
        error: "Failed to update visitor count"
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}