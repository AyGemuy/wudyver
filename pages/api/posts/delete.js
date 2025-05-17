import connectMongo from "@/lib/mongoose";
import Post from "@/models/Post";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "DELETE") {
    const {
      slug
    } = req.query;
    try {
      const deletedPost = await Post.findOneAndDelete({
        slug: slug
      });
      if (!deletedPost) {
        return res.status(404).json({
          error: "Post not found"
        });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete post"
      });
    }
  } else {
    res.setHeader("Allow", ["DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}