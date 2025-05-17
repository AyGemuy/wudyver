import connectMongo from "@/lib/mongoose";
import Post from "@/models/Post";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "POST") {
    try {
      const {
        title,
        content,
        author,
        description,
        slug,
        thumbnail
      } = req.body;
      const newPost = new Post({
        title: title,
        content: content,
        author: author,
        description: description,
        slug: slug,
        thumbnail: thumbnail
      });
      const savedPost = await newPost.save();
      res.status(201).json(savedPost);
    } catch (error) {
      res.status(500).json({
        error: "Failed to create post"
      });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}