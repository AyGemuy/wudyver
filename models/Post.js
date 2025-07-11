import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
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
  authorAvatar: {
    type: String,
    default: "https://placehold.co/40x40/cccccc/000000?text=NA"
  }
}, {
  timestamps: true
});
export default mongoose.models.Post || mongoose.model("Post", postSchema);