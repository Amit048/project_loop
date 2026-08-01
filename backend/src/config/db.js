import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.log("❌ MONGO_URI is not set. Add it to backend/.env — see backend/.env.example.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("❌ MongoDB Connection Failed:", error.message);

    if (error.message.includes("ECONNREFUSED") || uri.includes("localhost") || uri.includes("127.0.0.1")) {
      console.log(
        "\n👉 Your MONGO_URI points to a local MongoDB (localhost), but nothing is listening there.\n" +
        "   Either:\n" +
        "   (a) Install & start MongoDB locally (e.g. `mongod` running as a service), or\n" +
        "   (b) Easier — create a free MongoDB Atlas cluster (https://cloud.mongodb.com), grab its\n" +
        "       connection string, and set MONGO_URI in backend/.env to that instead, e.g.:\n" +
        "       MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/projectloop\n"
      );
    } else if (error.message.toLowerCase().includes("authentication failed")) {
      console.log("\n👉 The username/password in your MONGO_URI is wrong, or the DB user doesn't have access to this database.\n");
    } else if (error.message.toLowerCase().includes("querysrv") || error.message.toLowerCase().includes("enotfound")) {
      console.log("\n👉 The cluster hostname in MONGO_URI looks wrong, or your network/firewall is blocking it. Double-check you copied the full connection string from Atlas.\n");
    }

    process.exit(1);
  }
};