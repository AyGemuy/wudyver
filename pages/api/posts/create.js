import connectMongo from "../../../lib/mongoose";
import Post from "../../../models/Post";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "POST") {
    const {
      title,
      content,
      author,
      description
    } = req.body;
    if (!title || !content || !author) {
      return res.status(400).json({
        error: "All fields are required."
      });
    }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const post = new Post({
      title: title,
      content: content,
      author: author,
      description: description,
      slug: slug
    });
    await post.save();
    return res.status(201).json(post);
  }
  res.status(405).json({
    error: "Method not allowed"
  });
}