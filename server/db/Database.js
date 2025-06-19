import { connect } from "mongoose";
import process from "process";

const connectDatabase = async () => {
  try {
    const data = await connect(process.env.DB_URL);
    console.log(`✅ MongoDB connected: ${data.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1); // Exit the process if connection fails
  }
};

export default connectDatabase;
