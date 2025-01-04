import mongoose from "mongoose";

mongoose.set('debug', false);

const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch {
    throw new Error("Failed to connect to MongoDB");
  }
};

export default connectMongo;
