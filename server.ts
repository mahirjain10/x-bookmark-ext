import express, { Request, Response } from "express";
import cors from "cors";
import folderRoutes from "./router/folderRoutes";
import searchRoutes from "./router/searchRoutes";
import bookmarkRoutes from "./router/bookmarkRoutes";
import { connectDB } from "./db";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Define query parameter interface for /auth/x/callback
interface AuthCallbackQuery {
  code?: string;
  state?: string;
}

// Connect to MongoDB before starting the server
connectDB().then(() => {
  app.use("/folders", folderRoutes);
  app.use("/search", searchRoutes);
  app.use("/bookmark", bookmarkRoutes);

  app.get("/", (req: Request, res: Response) => {
    res.send("Hello, X-Bookmark Server!");
  });

  const CLIENT_ID = "STZ0eHdVUUh0T2JETlAtSXFKTzU6MTpjaQ"; // Replace with your API Key from X Portal
  const CALLBACK_URL = "https://x-boomark-ext.onrender.com/auth/x/callback";

  // Start the login flow
  app.get("/auth/x", (req: Request, res: Response) => {
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${CALLBACK_URL}&scope=users.read&state=xyz123&code_challenge=challenge&code_challenge_method=S256`;
    res.redirect(authUrl);
  });

  // Handle the callback
  app.get(
    "/auth/x/callback",
    (req: Request<{}, any, any, AuthCallbackQuery>, res: Response) => {
      const { code, state } = req.query;
      if (state !== "xyz123") {
        res.status(400).send("Invalid state");
        return; // Explicit return to satisfy TypeScript
      }
      res.send(
        `Received code: ${code} - Next step: Exchange this for an access token`
      );
    }
  );

  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
});
