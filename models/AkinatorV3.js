import mongoose from 'mongoose';

const AkinatorSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  akiData: { type: String, required: true },
  region: { type: String, required: true },
  childMode: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.AkinatorV3 || mongoose.model('AkinatorV3', AkinatorSchema);
