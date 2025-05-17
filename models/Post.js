import mongoose from "mongoose";
const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  thumbnail: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});
const Post = mongoose.models.Post || mongoose.model("Post", PostSchema);
export default Post;