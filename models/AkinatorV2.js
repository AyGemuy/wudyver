import mongoose from "mongoose";
const AkinatorSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true
  },
  childMode: {
    type: Boolean,
    default: false
  },
  currentStep: {
    type: Number,
    default: 0
  },
  stepLastProposition: {
    type: String,
    default: ""
  },
  progress: {
    type: String,
    default: "0.00000"
  },
  answers: {
    type: [String],
    default: []
  },
  question: {
    type: String,
    default: null
  },
  session: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  guessed: {
    id: {
      type: String,
      default: null
    },
    name: {
      type: String,
      default: null
    },
    description: {
      type: String,
      default: null
    },
    photo: {
      type: String,
      default: null
    }
  },
  akiWin: {
    type: Boolean,
    default: null
  }
}, {
  timestamps: true
});
export default mongoose.models.AkinatorV2 || mongoose.model("AkinatorV2", AkinatorSchema);