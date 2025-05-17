import connectMongo from "@/lib/mongoose";
import Post from "@/models/Post";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "GET") {
    try {
      const posts = await Post.find({});
      return res.status(200).json(posts);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch posts"
      });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}