import mongoose from "mongoose";
const apiInfoSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    default: "info"
  },
  count: {
    type: Number,
    default: 0
  },
  route: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  routeHits: {
    type: Map,
    of: Number,
    default: {}
  },
  hourlyHits: {
    type: [Number],
    default: new Array(24).fill(0)
  },
  dailyHits: {
    type: Map,
    of: Number,
    default: {}
  },
  weeklyHits: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});
const ApiInfo = mongoose.models.ApiInfo || mongoose.model("ApiInfo", apiInfoSchema);
export default ApiInfo;