import mongoose from "mongoose";
const AnonymousSchema = new mongoose.Schema({
  socketId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
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
  }
});
export default mongoose.models.Anonymous || mongoose.model("Anonymous", AnonymousSchema);