// models/Request.js
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Mengizinkan _id sebagai String
  count: { type: Number, default: 0 }
});

export default mongoose.models.Request || mongoose.model('Request', requestSchema);