import mongoose from 'mongoose';

const AkinatorSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
  },
  childMode: {
    type: Boolean,
    required: true,
  },
  currentStep: {
    type: Number,
    required: true,
  },
  progress: {
    type: Number,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  session: {
    type: String,
    required: true, // Ensure session is required
  },
  signature: {
    type: String,
    required: true,
  },
  guessed: {
    type: Boolean,
    default: false,
  },
  akiWin: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const akiSession = mongoose.models.Akinator || mongoose.model('Akinator', AkinatorSchema);

export default akiSession;
