import connectMongo from "@/lib/mongoose";
import Post from "@/models/Post";
export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed`
    });
  }
  try {
    await connectMongo();
    const {
      originalSlug,
      title,
      content,
      author,
      description,
      slug,
      thumbnail
    } = req.body;
    if (!originalSlug) {
      return res.status(400).json({
        error: "Original slug is required"
      });
    }
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
    if (slug !== originalSlug) {
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
    }
    const updatedPost = await Post.findOneAndUpdate({
      slug: originalSlug
    }, {
      title: title,
      content: content,
      author: author,
      description: description,
      slug: slug,
      thumbnail: thumbnail || "",
      updatedAt: new Date()
    }, {
      new: true
    });
    if (!updatedPost) {
      return res.status(404).json({
        error: "Post not found"
      });
    }
    return res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({
      error: "Failed to update post: " + (error.message || "Unknown error")
    });
  }
}