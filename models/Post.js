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
    type: String
  },
  slug: {
    type: String,
    unique: true,
    required: true
  }
});
export default mongoose.models.Post || mongoose.model("Post", PostSchema);