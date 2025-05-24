import connectMongo from "@/lib/mongoose";
import Post from "@/models/Post";
export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed`
    });
  }
  try {
    await connectMongo();
    const {
      slug
    } = req.query;
    if (!slug) {
      return res.status(400).json({
        error: "Slug parameter is required"
      });
    }
    const deletedPost = await Post.findOneAndDelete({
      slug: slug
    });
    if (!deletedPost) {
      return res.status(404).json({
        error: "Post not found"
      });
    }
    return res.status(200).json({
      message: "Post deleted successfully",
      slug: slug
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      error: "Failed to delete post: " + (error.message || "Unknown error")
    });
  }
}