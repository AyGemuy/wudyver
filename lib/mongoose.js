import mongoose from "mongoose";
import apiConfig from "@/configs/apiConfig";
let isConnected = false;
const connectMongo = async () => {
  if (isConnected) {
    return;
  }
  if (mongoose.connection.readyState === 2) {
    return;
  }
  try {
    await mongoose.connect(apiConfig.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      socketTimeoutMS: 3e4,
      serverSelectionTimeoutMS: 5e3
    });
    isConnected = true;
    console.log("Connected to MongoDB successfully.");
    if (mongoose.connection.listeners("connected").length === 0) {
      mongoose.connection.on("connected", () => {
        console.log("Mongoose connected to MongoDB.");
      });
    }
    if (mongoose.connection.listeners("error").length === 0) {
      mongoose.connection.on("error", err => {
        console.error("Mongoose connection error:", err.message);
        isConnected = false;
      });
    }
    if (mongoose.connection.listeners("disconnected").length === 0) {
      mongoose.connection.on("disconnected", () => {
        console.warn("Mongoose disconnected from MongoDB.");
        isConnected = false;
      });
    }
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    isConnected = false;
    throw error;
  }
};
export default connectMongo;