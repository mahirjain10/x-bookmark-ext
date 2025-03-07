import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const uri = process.env.MONGO_URI as string;

if (!uri) {
  throw new Error(
    "❌ MongoDB URI is not defined in the environment variables."
  );
}

export async function connectDB() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });

    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1); // Exit the process if connection fails
  }
}
