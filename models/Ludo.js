import mongoose from "mongoose";
import {
  v4 as uuidv4
} from "uuid";
const playerPieceSchema = new mongoose.Schema({
  a: {
    type: Number,
    default: 0
  },
  b: {
    type: Number,
    default: 0
  },
  c: {
    type: Number,
    default: 0
  },
  d: {
    type: Number,
    default: 0
  }
}, {
  _id: false
});
const ludoSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4,
    required: true
  },
  bg: {
    type: String,
    required: true
  },
  totalPlayers: {
    type: Number,
    required: true,
    enum: [2, 3, 4]
  },
  state: {
    p1: playerPieceSchema,
    p2: playerPieceSchema,
    p3: {
      type: playerPieceSchema,
      default: null
    },
    p4: {
      type: playerPieceSchema,
      default: null
    }
  }
}, {
  timestamps: true,
  _id: false
});
export default mongoose.models.Ludo || mongoose.model("Ludo", ludoSchema);