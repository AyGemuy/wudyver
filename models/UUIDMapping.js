import mongoose from "mongoose";
const uuidMappingSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: {
      expires: "12h"
    }
  }
});
const UUIDMapping = mongoose.models.UUIDMapping || mongoose.model("UUIDMapping", uuidMappingSchema);
export default UUIDMapping;