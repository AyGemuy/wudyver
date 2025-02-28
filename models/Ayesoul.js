import mongoose from "mongoose";
const AyesoulSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: false
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["chat", "vision", "genimage"],
    required: true
  }
}, {
  timestamps: true
});
export default mongoose.models.Ayesoul || mongoose.model("Ayesoul", AyesoulSchema);