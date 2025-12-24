import mongoose from "mongoose";
import {
  v4 as uuidv4
} from "uuid";
const UserSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed,
    default: () => uuidv4()
  },
  email: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    unique: true
  },
  password: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  ipAddress: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});
export default mongoose.models.User || mongoose.model("User", UserSchema);