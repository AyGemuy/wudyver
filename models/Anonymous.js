import {
  Schema,
  model,
  models
} from "mongoose";
const AnonymousSchema = new Schema({
  socketId: {
    type: String,
    required: true,
    unique: true
  },
  nickname: {
    type: String,
    default: "Anonymous"
  },
  online: {
    type: Boolean,
    default: false
  },
  playing: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "1h"
  }
});
const Anonymous = models.Anonymous || model("Anonymous", AnonymousSchema);
export default Anonymous;