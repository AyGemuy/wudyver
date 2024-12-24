import mongoose from 'mongoose';

const AkinatorSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  region: {
    type: String,
    required: true,
    enum: ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'tr', 'cz', 'ro', 'hu', 'ar', 'ja', 'ko', 'zh'],
  },
  childMode: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: 0,
  },
  currentQuestion: {
    type: String,
    default: '',
  },
  isWin: {
    type: Boolean,
    default: false,
  },
  suggestion: {
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    photo: { type: String, default: '' },
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.AkinatorSession || mongoose.model('AkinatorSession', AkinatorSessionSchema);
