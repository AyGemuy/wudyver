import mongoose from "mongoose";
const ChessSchema = new mongoose.Schema({
  boardConfiguration: {
    type: Object,
    required: true
  },
  turn: {
    type: String,
    enum: ["white", "black"],
    required: true
  },
  isFinished: {
    type: Boolean,
    default: false
  },
  winner: {
    type: String,
    enum: ["white", "black", "draw", null],
    default: null
  }
}, {
  timestamps: true
});
export default mongoose.models.Chess || mongoose.model("Chess", ChessSchema);