import mongoose from 'mongoose';

const DataUserSchema = new mongoose.Schema({
  customId: { type: mongoose.Schema.Types.Mixed, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.models.DataUser || mongoose.model('DataUser', DataUserSchema);