import express from "express";
import cors from "cors";
import folderRoutes from "./router/folderRoutes";
import searchRoutes from "./router/searchRoutes";
import { connectDB } from "./db";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB before starting the server
connectDB().then(() => {
  app.use("/folders", folderRoutes);
  app.use("/search", searchRoutes);

  app.get("/", (req, res) => {
    res.send("Hello, X-Bookmark Server!");
  });
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
});
