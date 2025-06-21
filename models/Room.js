import mongoose from "mongoose";
const MessageSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ""
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  edited: {
    type: Number,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  likes: {
    type: [String],
    default: []
  },
  dislikes: {
    type: [String],
    default: []
  },
  reactions: [{
    emoji: String,
    userId: String
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room.messages",
    default: null
  }
}, {
  timestamps: false
});
const RoomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    unique: true
  },
  messages: [MessageSchema],
  isGroup: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
export default mongoose.models.Room || mongoose.model("Room", RoomSchema);