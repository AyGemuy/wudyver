import mongoose from 'mongoose';

const aiContinuesSchema = new mongoose.Schema({
  gf4id: { type: String, required: true, unique: true },
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const AiContinues = mongoose.models.AiContinues || mongoose.model('AiContinues', aiContinuesSchema);

export default AiContinues;
