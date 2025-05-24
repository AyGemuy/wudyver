import mongoose from "mongoose";
const replySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  }
}, {
  _id: false
});
const commentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  replies: {
    type: [replySchema],
    default: []
  }
}, {
  timestamps: true
});
const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
export default Comment;