import mongoose from "mongoose";
const DataUserSchema = new mongoose.Schema({
  customId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});
export default mongoose.models.DataUser || mongoose.model("DataUser", DataUserSchema);