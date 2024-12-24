import mongoose from 'mongoose';

const EqingChatHistorySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  history: [
    {
      role: { type: String, enum: ['user', 'assistant'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const EqingChatHistory = mongoose.models.EqingChatHistory || mongoose.model('EqingChatHistory', EqingChatHistorySchema);

export default EqingChatHistory;
