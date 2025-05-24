// models/Anonymous.js
import mongoose from "mongoose";

const AnonymousSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true,
    unique: true
  },
  nickname: {
    type: String,
    default: "Anonymous"
  },
  online: {
    type: Boolean,
    default: true
  },
  playing: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Automatically delete documents after 1 hour
  }
});

export default mongoose.models.Anonymous || mongoose.model("Anonymous", AnonymousSchema);