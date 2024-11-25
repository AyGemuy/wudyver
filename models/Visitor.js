// models/Visitor.js
import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
});

const Visitor = mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);

export default Visitor;