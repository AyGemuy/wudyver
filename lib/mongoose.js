import {
  LRUCache
} from "lru-cache";
import mongoose from "mongoose";
import apiConfig from "@/configs/apiConfig";
const isConnectedCache = new LRUCache({
  max: 1e3,
  ttl: 1e3 * 60 * 60 * 12
});
const connectMongo = async () => {
  if (isConnectedCache.get("status")) {
    console.log("MongoDB is already connected (from cache). Skipping connection attempt.");
    return;
  }
  if (mongoose.connection.readyState === 2) {
    console.log("MongoDB connection is in progress. Waiting...");
    return;
  }
  const MAX_RETRIES = 5;
  let retryCount = 0;
  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Attempting to connect to MongoDB (Attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      await mongoose.connect(apiConfig.MONGODB_URI, {
        serverSelectionTimeoutMS: 5e3,
        socketTimeoutMS: 3e4
      });
      isConnectedCache.set("status", true);
      console.log(`✅ Successfully connected to MongoDB at: ${mongoose.connection.host}/${mongoose.connection.name}`);
      mongoose.connection.on("connected", () => {
        console.log("⚡ Mongoose reconnected to MongoDB.");
        isConnectedCache.set("status", true);
      });
      mongoose.connection.on("error", err => {
        console.error("❌ Mongoose connection error:", err);
        isConnectedCache.delete("status");
      });
      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ Mongoose disconnected from MongoDB.");
        isConnectedCache.delete("status");
      });
      return;
    } catch (error) {
      retryCount++;
      console.error(`🔴 Failed to connect to MongoDB (Attempt ${retryCount}/${MAX_RETRIES}):`, error.message);
      if (retryCount < MAX_RETRIES) {
        const backoffTime = Math.pow(2, retryCount) * 1e3;
        console.log(`Will retry in ${backoffTime / 1e3} seconds...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        console.error("❌ All connection attempts failed. The application will not connect to the database.");
        isConnectedCache.delete("status");
        throw error;
      }
    }
  }
};
export default connectMongo;