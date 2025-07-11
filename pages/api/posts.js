import dbConnect from "@/lib/mongoose";
import Post from "@/models/Post";
import mongoose from "mongoose";
export default async function handler(req, res) {
  await dbConnect();
  switch (req.method) {
    case "GET":
      try {
        const {
          search,
          sortBy,
          id
        } = req.query;
        let query = {};
        let sortOptions = {
          createdAt: -1
        };
        if (id) {
          if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
              success: false,
              message: "Invalid Post ID format."
            });
          }
          const post = await Post.findById(id);
          if (!post) {
            return res.status(404).json({
              success: false,
              message: "Post not found."
            });
          }
          return res.status(200).json({
            success: true,
            data: post
          });
        }
        if (search) {
          query.title = {
            $regex: search,
            $options: "i"
          };
        }
        if (sortBy) {
          if (sortBy === "title") {
            sortOptions = {
              title: 1
            };
          } else if (sortBy === "author") {
            sortOptions = {
              author: 1
            };
          }
        }
        const posts = await Post.find(query).sort(sortOptions);
        if (posts.length === 0 && !search) {
          return res.status(404).json({
            success: false,
            message: "No posts found."
          });
        }
        return res.status(200).json({
          success: true,
          data: posts
        });
      } catch (error) {
        console.error("Error fetching posts:", error);
        return res.status(500).json({
          success: false,
          message: "Error fetching posts."
        });
      }
    case "POST":
      const {
        title,
        content,
        author,
        authorAvatar
      } = req.body;
      if (!title || !content || !author) {
        return res.status(400).json({
          success: false,
          message: "Title, content, and author are required."
        });
      }
      try {
        const newPost = await Post.create({
          title: title,
          content: content,
          author: author,
          authorAvatar: authorAvatar
        });
        return res.status(201).json({
          success: true,
          message: "Post created successfully!",
          data: newPost
        });
      } catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json({
          success: false,
          message: "Error creating post."
        });
      }
    case "PUT":
      const {
        postId,
        newTitle,
        newContent
      } = req.body;
      if (!postId || !newTitle || !newContent) {
        return res.status(400).json({
          success: false,
          message: "Post ID, new title, and new content are required."
        });
      }
      try {
        const updatedPost = await Post.findByIdAndUpdate(postId, {
          title: newTitle,
          content: newContent,
          updatedAt: Date.now()
        }, {
          new: true,
          runValidators: true
        });
        if (!updatedPost) {
          return res.status(404).json({
            success: false,
            message: "Post not found."
          });
        }
        return res.status(200).json({
          success: true,
          message: "Post updated successfully!",
          data: updatedPost
        });
      } catch (error) {
        console.error("Error updating post:", error);
        return res.status(500).json({
          success: false,
          message: "Error updating post."
        });
      }
    case "DELETE":
      const {
        id
      } = req.query;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Post ID is required."
        });
      }
      try {
        const deletedPost = await Post.findByIdAndDelete(id);
        if (!deletedPost) {
          return res.status(404).json({
            success: false,
            message: "Post not found."
          });
        }
        return res.status(200).json({
          success: true,
          message: "Post deleted successfully!"
        });
      } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({
          success: false,
          message: "Error deleting post."
        });
      }
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}