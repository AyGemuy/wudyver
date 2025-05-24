import connectMongo from "@/lib/mongoose";
import Post from "@/models/Post";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed`
    });
  }
  try {
    await connectMongo();
    const {
      slug
    } = req.query;
    if (slug) {
      const post = await Post.findOne({
        slug: slug
      }).lean();
      if (!post) {
        return res.status(404).json({
          error: "Post not found"
        });
      }
      return res.status(200).json(post);
    } else {
      const posts = await Post.find({}).sort({
        createdAt: -1
      }).lean();
      return res.status(200).json(posts);
    }
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({
      error: "Failed to fetch posts: " + (error.message || "Unknown error")
    });
  }
}