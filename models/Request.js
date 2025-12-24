import mongoose from "mongoose";
const requestSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  }
});
export default mongoose.models.Request || mongoose.model("Request", requestSchema);