import mongoose from "mongoose";
const CodeSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  tag: {
    type: String,
    default: "Unknown"
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: "codes"
});
export default mongoose.models.Code || mongoose.model("Code", CodeSchema);