import dotenv from "dotenv";
dotenv.config();

const { connectDB } = await import("./src/config/db.js");
const { default: app } = await import("./app.js");

// Connect Database
connectDB();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server Running On Port ${PORT}`);
});