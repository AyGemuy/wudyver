import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    try {
      await connectMongo();
      const users = await User.find().select("email ipAddress password");
      const userCount = users.length;
      return res.status(200).json({
        users: users,
        userCount: userCount
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({
        error: "Failed to fetch user stats"
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}