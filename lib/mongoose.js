import mongoose from 'mongoose';
import chalk from 'chalk';

const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(chalk.green('MongoDB connected successfully'));
  } catch (error) {
    console.error(chalk.red(`MongoDB connection error: ${error.message}`));
    throw new Error('Failed to connect to MongoDB');
  }
};

export default connectMongo;
