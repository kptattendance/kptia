import mongoose from "mongoose";

// The connection is opened once and shared.
// On Vercel the same promise is reused by every
// request handled by a warm function instance.

let connectionPromise = null;

const connectDB = () => {
  if (connectionPromise) {
    return connectionPromise;
  }

  if (!process.env.MONGO_URI) {
    return Promise.reject(
      new Error("MONGO_URI is not defined in .env")
    );
  }

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, {
      // modern options, mongoose >= 8 handles most automatically
      dbName: process.env.MONGO_DB_NAME || "kptia",
    })
    .then((conn) => {
      console.log(`✅ MongoDB connected.....: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      console.error("❌ MongoDB connection error........:", error.message);

      // Allow the next request to try again.
      connectionPromise = null;

      throw error;
    });

  return connectionPromise;
};

export default connectDB;
