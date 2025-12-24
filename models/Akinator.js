import mongoose from "mongoose";
const AkinatorSessionSchema = new mongoose.Schema({
  session: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  step: {
    type: Number,
    required: true,
    default: 0
  },
  progression: {
    type: Number,
    required: true,
    default: 0
  },
  region: {
    type: String,
    required: true,
    default: "id"
  },
  gameState: {
    cookieJar: {
      type: Object,
      default: {}
    },
    finished: {
      type: Boolean,
      default: false
    },
    currentTheme: {
      type: String,
      default: ""
    },
    childMode: {
      type: String,
      default: "false"
    },
    stepLastProposition: {
      type: String,
      default: ""
    },
    proposition: {
      pid: {
        type: String,
        default: ""
      },
      pidbase: {
        type: String,
        default: ""
      },
      name: {
        type: String,
        default: ""
      },
      description: {
        type: String,
        default: ""
      },
      photo: {
        type: String,
        default: ""
      },
      flagPhoto: {
        type: String,
        default: ""
      },
      nbElements: {
        type: String,
        default: "0"
      },
      noQuestion: {
        type: String,
        default: "0"
      }
    }
  },
  userAgent: {
    type: String,
    default: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
  },
  ipAddress: {
    type: String,
    default: ""
  },
  gameHistory: [{
    step: Number,
    question: String,
    answer: String,
    answerId: Number,
    progression: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  indexes: [{
    session: 1
  }, {
    createdAt: -1
  }, {
    updatedAt: -1
  }, {
    "gameState.finished": 1
  }]
});
AkinatorSessionSchema.pre("save", function(next) {
  if (this.isNew) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    this.constructor.deleteMany({
      updatedAt: {
        $lt: twentyFourHoursAgo
      }
    }).catch(err => console.log("Cleanup error:", err));
  }
  next();
});
AkinatorSessionSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({
    _id: sessionId
  });
};
AkinatorSessionSchema.statics.findActiveSessions = function() {
  return this.find({
    "gameState.finished": false
  });
};
AkinatorSessionSchema.statics.findFinishedSessions = function() {
  return this.find({
    "gameState.finished": true
  });
};
AkinatorSessionSchema.statics.cleanupOldSessions = function(hoursOld = 24) {
  const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1e3);
  return this.deleteMany({
    updatedAt: {
      $lt: cutoffDate
    }
  });
};
AkinatorSessionSchema.methods.addToHistory = function(questionData) {
  this.gameHistory.push(questionData);
  return this.save();
};
AkinatorSessionSchema.methods.isExpired = function(hoursOld = 24) {
  const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1e3);
  return this.updatedAt < cutoffDate;
};
AkinatorSessionSchema.virtual("gameDuration").get(function() {
  return this.updatedAt - this.createdAt;
});
AkinatorSessionSchema.set("toJSON", {
  virtuals: true,
  transform: function(doc, ret) {
    ret.session_id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});
const AkinatorSession = mongoose.models.AkinatorSession || mongoose.model("AkinatorSession", AkinatorSessionSchema);
export default AkinatorSession;