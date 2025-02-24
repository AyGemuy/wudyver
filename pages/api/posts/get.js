import connectMongo from "../../../lib/mongoose";
import Post from "../../../models/Post";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "GET") {
    const {
      slug
    } = req.query;
    if (slug) {
      const post = await Post.findOne({
        slug: slug
      });
      if (!post) {
        return res.status(404).json({
          error: "Post not found"
        });
      }
      return res.status(200).json(post);
    } else {
      const posts = await Post.find({});
      return res.status(200).json(posts);
    }
  }
  res.status(405).json({
    error: "Method not allowed"
  });
}