// lib/mongoose.js
import mongoose from 'mongoose';

const connectMongo = async () => {
  // Return early if the connection is already established
  if (mongoose.connection.readyState === 1) return;

  try {
    // Establish connection to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    // Log the error if the connection fails
    console.error('MongoDB connection error:', error.message);
    throw new Error('Failed to connect to MongoDB');
  }
};

export default connectMongo;
