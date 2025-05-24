// /models/Post.js
import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please provide a title for this post"],
    trim: true,
    maxlength: [120, "Title cannot be more than 120 characters"]
  },
  content: {
    type: String,
    required: [true, "Please provide content for this post"],
    trim: true
  },
  author: {
    type: String,
    required: [true, "Please provide an author name"],
    trim: true,
    maxlength: [60, "Author name cannot be more than 60 characters"]
  },
  description: {
    type: String,
    required: [true, "Please provide a short description"],
    trim: true,
    maxlength: [240, "Description cannot be more than 240 characters"]
  },
  slug: {
    type: String,
    required: [true, "Please provide a slug"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"]
  },
  thumbnail: {
    type: String,
    trim: true,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model is already defined to prevent OverwriteModelError
// This is especially important in Next.js development with hot reloading
export default mongoose.models.Post || mongoose.model("Post", PostSchema);