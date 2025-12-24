import mongoose from "mongoose";
const TicTacToeSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  board: {
    type: [
      [String]
    ],
    required: true,
    default: Array(3).fill().map(() => Array(3).fill(null))
  },
  currentPlayer: {
    type: String,
    required: true,
    enum: ["X", "O"],
    default: "X"
  },
  winner: {
    type: String,
    enum: ["X", "O", "draw", null],
    default: null
  }
}, {
  timestamps: true
});
export default mongoose.models.TicTacToe || mongoose.model("TicTacToe", TicTacToeSchema);