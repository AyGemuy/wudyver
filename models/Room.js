import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
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
const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    unique: true
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);
export default Room;