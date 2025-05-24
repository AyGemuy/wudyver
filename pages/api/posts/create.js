import connectMongo from "@/lib/mongoose";
import Post from "@/models/Post";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed`
    });
  }
  try {
    await connectMongo();
    const {
      title,
      content,
      author,
      description,
      slug,
      thumbnail
    } = req.body;
    const fieldErrors = {};
    if (!title?.trim()) fieldErrors.title = "Title is required";
    if (!content?.trim()) fieldErrors.content = "Content is required";
    if (!author?.trim()) fieldErrors.author = "Author is required";
    if (!description?.trim()) fieldErrors.description = "Description is required";
    if (!slug?.trim()) {
      fieldErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      fieldErrors.slug = "Slug can only contain lowercase letters, numbers, and hyphens";
    }
    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        fieldErrors: fieldErrors
      });
    }
    const existingPost = await Post.findOne({
      slug: slug
    });
    if (existingPost) {
      return res.status(400).json({
        error: "A post with this slug already exists",
        fieldErrors: {
          slug: "This slug is already in use. Please choose another one."
        }
      });
    }
    const newPost = new Post({
      title: title,
      content: content,
      author: author,
      description: description,
      slug: slug,
      thumbnail: thumbnail || "",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const savedPost = await newPost.save();
    return res.status(201).json(savedPost);
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({
      error: "Failed to create post: " + (error.message || "Unknown error")
    });
  }
}