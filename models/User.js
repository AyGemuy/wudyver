// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Allow _id as String
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ipAddress: { type: String, required: true },
});

// Ensure that the model name is consistent (remove extra space)
export default mongoose.models.User || mongoose.model('User ', UserSchema);