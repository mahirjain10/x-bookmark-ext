import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import folderRoutes from "./router/folderRoutes";
// import bookmarkRoutes from "./router/bookmarkRoutes";
import searchRoutes from "./router/searchRoutes";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/x-bookmark";

mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("⚠️ MongoDB Connection Failed:", err));

app.use("/folders", folderRoutes);
app.use("/search", searchRoutes);

// app.use("/bookmarks", bookmarkRoutes);
app.get("/", (req, res) => {
  res.write("hello");
});
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
