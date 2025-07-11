import mongoose from "mongoose";
const PasteCodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: false
  },
  content: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  syntax: {
    type: String,
    default: "text"
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});
const PasteCode = mongoose.models.PasteCode || mongoose.model("PasteCode", PasteCodeSchema);
export default PasteCode;