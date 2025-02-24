import connectMongo from "../../../lib/mongoose";
import Post from "../../../models/Post";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "DELETE") {
    const {
      slug
    } = req.query;
    if (!slug) {
      return res.status(400).json({
        error: "Slug is required."
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
      message: "Post deleted successfully"
    });
  }
  res.status(405).json({
    error: "Method not allowed"
  });
}