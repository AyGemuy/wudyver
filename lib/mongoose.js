import mongoose from "mongoose";
import apiConfig from "@/configs/apiConfig";
const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) return;
  mongoose.connect(apiConfig.MONGODB_URI).then(() => {
    console.log("Connected to MongoDB successfully.");
  }).catch(error => {
    console.error("Failed to connect to MongoDB:", error.message);
  });
  mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to MongoDB.");
  });
  mongoose.connection.on("error", err => {
    console.error("Mongoose connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("Mongoose disconnected from MongoDB.");
  });
};
export default connectMongo;