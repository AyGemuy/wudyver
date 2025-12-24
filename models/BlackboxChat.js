import mongoose from "mongoose";
const blackboxChatSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
const BlackboxChat = mongoose.models.BlackboxChat || mongoose.model("BlackboxChat", blackboxChatSchema);
export default BlackboxChat;