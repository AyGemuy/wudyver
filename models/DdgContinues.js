import mongoose from "mongoose";
const DdgContinuesSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  history: [{
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});
export default mongoose.models.DdgContinues || mongoose.model("DdgContinues", DdgContinuesSchema);