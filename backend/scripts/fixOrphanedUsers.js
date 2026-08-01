import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Workspace from "../src/models/Workspace.js";

dotenv.config();

async function run() {
  await connectDB();

  const orphans = await User.find({ workspaceId: null });

  for (const user of orphans) {
    const workspace = await Workspace.create({
      name: `${user.name.split(" ")[0]}'s Workspace`,
      owner: user._id,
    });
    user.workspaceId = workspace._id;
    user.role = "admin";
    await user.save({ validateBeforeSave: false });
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
