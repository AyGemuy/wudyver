// models/Visitor.js
import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Mengizinkan _id sebagai String
  count: { type: Number, default: 0 }
});

export default mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);