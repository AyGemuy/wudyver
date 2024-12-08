import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ipAddress: { type: String, required: true, unique: true }, // Ensure unique IP addresses
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
