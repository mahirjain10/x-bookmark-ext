import { Request, Response } from "express";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import session from "express-session";
import { createClient } from "redis";
import { RedisClientType } from "@redis/client";
import { MemoryStore } from "express-session";
import { RedisStore } from "connect-redis";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandomString,
} from "../utils/authUtils";
import User from "../models/AuthSchema";

// Declare session types
declare module "express-session" {
  interface SessionData {
    oauthState?: {
      state: string;
      codeVerifier: string;
      createdAt: number;
    };
    tokens?: {
      access_token: string;
      expires_at: number;
    };
    user?: {
      userId: string;
      username: string;
    };
  }
}

dotenv.config();

const {
  CLIENT_ID,
  CLIENT_SECRET,
  CALLBACK_URL,
  NODE_ENV,
  SESSION_SECRET,
  REDIS_URL,
} = process.env;

// Validate environment variables
if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL || !SESSION_SECRET) {
  throw new Error("Missing required environment variables");
}

// Redis setup (used for sessions)
let redisClient: RedisClientType | null = null;
let store: RedisStore | MemoryStore = new MemoryStore(); // Initialize with MemoryStore

async function initializeRedis() {
  // Only try Redis in production
  if (NODE_ENV === "production" && REDIS_URL) {
    try {
      redisClient = createClient({
        url: REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              console.warn('Redis connection failed, falling back to MemoryStore');
              return false; // Stop retrying
            }
            return Math.min(retries * 1000, 3000);
          },
        },
      });

      redisClient.on("error", (err) => {
        console.error("Redis error:", err);
      });

      redisClient.on("connect", () => {
        console.log("Redis connected successfully");
        store = new RedisStore({
          client: redisClient as RedisClientType,
          prefix: "x-bookmark:",
        });
      });

      await redisClient.connect();

      if (redisClient.isOpen) {
        await Promise.all([
          redisClient.configSet("maxmemory", "256mb"),
          redisClient.configSet("maxmemory-policy", "allkeys-lru"),
        ]).catch(err => console.error("Redis config error:", err));
      }
    } catch (error) {
      console.warn('Failed to initialize Redis, using MemoryStore:', error);
    }
  } else {
    console.log(NODE_ENV === "production" 
      ? 'No REDIS_URL provided, using MemoryStore' 
      : 'Development environment, using MemoryStore');
  }
}

// Initialize Redis in background
initializeRedis().catch(err => {
  console.error('Failed to initialize Redis:', err);
});

// Configure session middleware
export const sessionMiddleware = session({
  store,
  secret: SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === "production",
    httpOnly: true,
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  },
});

/**
 * Fetch user profile from Twitter
 */
async function getUserProfile(accessToken: string): Promise<any> {
  const response = await axios.get("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 5000,
  });
  return response.data.data;
}

/**
 * Step 1: Start login flow
 */
export const startLoginFlow = async (req: Request, res: Response): Promise<any> => {
  const state = generateRandomString(16);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  req.session.oauthState = { state, codeVerifier, createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID!,
    redirect_uri: CALLBACK_URL!,
    scope: "users.read offline.access tweet.read bookmark.read bookmark.write",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  res.redirect(`https://twitter.com/i/oauth2/authorize?${authParams.toString()}`);
};

/**
 * Step 2: Handle OAuth callback
 */
export const handleCallback = async (req: Request, res: Response): Promise<any> => {
  const { code, state } = req.query;

  if (typeof code !== "string" || typeof state !== "string") {
    return res.status(400).send("Invalid request: Missing code or state");
  }

  const oauthState = req.session.oauthState;
  if (!oauthState || oauthState.state !== state) {
    return res.status(400).send("Invalid state: Possible CSRF attack");
  }

  // Check state expiry (valid for 5 minutes)
  if (Date.now() - oauthState.createdAt > 5 * 60 * 1000) {
    return res.status(400).send("OAuth state expired");
  }

  delete req.session.oauthState;

  try {
    const tokenResponse = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK_URL!,
        client_id: CLIENT_ID!,
        code_verifier: oauthState.codeVerifier,
      }).toString(),
      {
        auth: { username: CLIENT_ID!, password: CLIENT_SECRET! },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const userProfile = await getUserProfile(access_token);

    // Update or create user
    const user = await User.findOneAndUpdate(
      { userId: userProfile.id },
      {
        userId: userProfile.id,
        username: userProfile.username,
        refreshToken: refresh_token,
      },
      { upsert: true, new: true }
    );

    if (!user) throw new Error("Failed to create/update user");

    // Store tokens and user info in session
    req.session.tokens = {
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    };
    
    req.session.user = {
      userId: user.userId,
      username: user.username,
    };

    if (redisClient) {
      await redisClient.expire(`x-bookmark:${req.sessionID}`, 12 * 60 * 60); // 12 hours
    }

    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

    res.redirect("/dashboard");
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("OAuth callback error:", axiosError.response?.data || axiosError.message);
    res.status(axiosError.response?.status || 500).send("Authentication failed");
  }
};

// Cleanup on process exit
process.on("SIGTERM", async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    console.log("Redis connection closed");
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    console.log("Redis connection closed");
  }
  process.exit(0);
});
