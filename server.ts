// server.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { startLoginFlow, handleCallback, sessionMiddleware } from "./controllers/authController";
import { connectDB } from "./db";
import bookmarkRoutes from "./routes/bookmarkRoutes";
import folderRoutes from "./router/folderRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors()); 
app.use(express.json());
app.use(sessionMiddleware);

// Database connection
connectDB();

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user?.userId) {
    next();
  } else {
    res.redirect('/auth/x');
  }
};

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  const { user } = req.session;
  const isLoggedIn = user?.userId;
  
  res.send(`
    <h1>X-Bookmark Server</h1>
    ${isLoggedIn 
      ? `<p>Welcome @${user.username}! <a href='/dashboard'>Go to Dashboard</a></p>`
      : `<p><a href='/auth/x'>Login with X</a></p>`
    }
  `);
});

// Authentication routes
app.get("/auth/x", startLoginFlow);
app.get("/auth/x/callback", handleCallback);

// Dashboard route (protected)
app.get("/dashboard", isAuthenticated, (req: Request, res: Response) => {
  const { user, tokens } = req.session;
  
  if (!user) {
    res.redirect('/auth/x');
    return;
  }
  
  res.send(`
    <h1>Dashboard</h1>
    <h2>User Profile</h2>
    <p>Username: @${user.username}</p>
    <p>User ID: ${user.userId}</p>
    <hr>
    <h2>Bookmarks</h2>
    <p><a href="/api/bookmarks/user/${user.userId}">View My Bookmarks</a></p>
    <form action="/api/bookmarks/create" method="POST">
      <h3>Add New Bookmark</h3>
      <input type="text" name="title" placeholder="Title" required>
      <input type="url" name="url" placeholder="URL" required>
      <button type="submit">Add Bookmark</button>
    </form>
    ${tokens ? `
      <hr>
      <h2>Session Info</h2>
      <p>Access Token: ${tokens.access_token}</p>
      <p>Expires at: ${new Date(tokens.expires_at).toLocaleString()}</p>
    ` : ''}
  `);
});

// Protected API routes
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/folders', folderRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
