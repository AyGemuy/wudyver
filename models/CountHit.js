import mongoose from "mongoose";
const CountHitSchema = new mongoose.Schema({
  site_name: {
    type: String,
    required: true,
    unique: true
  },
  hit: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});
export default mongoose.models.CountHit || mongoose.model("CountHit", CountHitSchema);